#!/usr/bin/env python3
"""One-time migration: clean corrupted conversation_messages records.

Fixes three corruption patterns that cause Anthropic API 400 errors:
1. Assistant messages containing tool_use blocks without matching tool_result
   in the following user message.
2. Consecutive same-role messages (e.g. user -> user).
3. Assistant messages that are tool_use-only (no text block) -- these are
   artifacts of the agent's tool calls and have no conversational value.

Strategy:
- Strip all tool_use blocks from assistant messages (already processed as JTDs).
- Strip all tool_result blocks from user messages (synthetic, no user content).
- Delete any messages that become empty after stripping.
- Merge consecutive same-role messages.
- Log every change.

Usage:
    # From the backend container:
    python scripts/clean_conversation_history.py
"""
import asyncio
import json
import os
import sys

import asyncpg


async def get_connection():
    return await asyncpg.connect(
        host=os.environ.get("DB_HOST", "db"),
        port=int(os.environ.get("DB_PORT", "5432")),
        user=os.environ.get("DB_USER", "atw"),
        password=os.environ.get("DB_PASSWORD", "atw_dev_password"),
        database=os.environ.get("DB_NAME", "atw_db"),
    )


async def clean_history():
    conn = await get_connection()
    tx = conn.transaction()
    await tx.start()

    print("=== Conversation History Cleanup ===\n")

    # -- Phase 1: Strip tool_use from assistant messages, tool_result from user --
    rows = await conn.fetch(
        "SELECT id, role, content FROM conversation_messages ORDER BY created_at"
    )
    print(f"Total messages in DB: {len(rows)}\n")

    stripped_count = 0
    emptied_ids: list[str] = []

    for row in rows:
        msg_id = row["id"]
        role = row["role"]
        content_raw = row["content"]

        if isinstance(content_raw, str):
            content = json.loads(content_raw)
        else:
            content = content_raw

        if not isinstance(content, list):
            continue

        if role == "assistant":
            cleaned = [
                b for b in content
                if not (isinstance(b, dict) and b.get("type") == "tool_use")
            ]
        elif role == "user":
            cleaned = [
                b for b in content
                if not (isinstance(b, dict) and b.get("type") == "tool_result")
            ]
        else:
            continue

        removed = len(content) - len(cleaned)
        if removed == 0:
            continue

        stripped_count += removed

        if not cleaned:
            emptied_ids.append(str(msg_id))
            print(f"  [{role}] {msg_id}: stripped {removed} block(s) -> EMPTY (will delete)")
        else:
            print(f"  [{role}] {msg_id}: stripped {removed} block(s), {len(cleaned)} remaining")
            await conn.execute(
                "UPDATE conversation_messages SET content = $1 WHERE id = $2",
                json.dumps(cleaned), msg_id,
            )

    print(f"\nPhase 1: stripped {stripped_count} tool_use/tool_result block(s)")

    # -- Phase 2: Delete emptied messages --
    if emptied_ids:
        deleted = await conn.execute(
            "DELETE FROM conversation_messages WHERE id = ANY($1::uuid[])",
            emptied_ids,
        )
        print(f"Phase 2: deleted {len(emptied_ids)} emptied message(s)")
    else:
        print("Phase 2: no empty messages to delete")

    # -- Phase 3: Merge consecutive same-role messages --
    rows = await conn.fetch(
        "SELECT id, use_case_id, role, content, created_at "
        "FROM conversation_messages ORDER BY use_case_id, created_at"
    )

    merge_count = 0
    delete_after_merge: list[str] = []
    prev_uc = None
    prev_role = None
    prev_id = None
    prev_content = None

    for row in rows:
        msg_id = row["id"]
        uc_id = row["use_case_id"]
        role = row["role"]
        content_raw = row["content"]

        if isinstance(content_raw, str):
            content = json.loads(content_raw)
        else:
            content = content_raw

        if not isinstance(content, list):
            prev_uc = uc_id
            prev_role = role
            prev_id = msg_id
            prev_content = content
            continue

        if uc_id == prev_uc and role == prev_role and prev_content is not None:
            merged = (list(prev_content) if isinstance(prev_content, list) else []) + content
            await conn.execute(
                "UPDATE conversation_messages SET content = $1 WHERE id = $2",
                json.dumps(merged), prev_id,
            )
            delete_after_merge.append(str(msg_id))
            prev_content = merged
            merge_count += 1
            print(f"  Merged [{role}] {msg_id} into {prev_id} (uc {uc_id})")
        else:
            prev_uc = uc_id
            prev_role = role
            prev_id = msg_id
            prev_content = content

    if delete_after_merge:
        await conn.execute(
            "DELETE FROM conversation_messages WHERE id = ANY($1::uuid[])",
            delete_after_merge,
        )
    print(f"Phase 3: merged {merge_count} consecutive same-role message(s)")

    # -- Commit --
    await tx.commit()

    # -- Verify --
    remaining = await conn.fetchval("SELECT count(*) FROM conversation_messages")
    print(f"\nDone. {remaining} messages remaining in DB.")

    # -- Post-verification: check for any remaining issues --
    issues = await conn.fetch("""
        WITH ordered AS (
            SELECT id, use_case_id, role, content, created_at,
                   LAG(role) OVER (PARTITION BY use_case_id ORDER BY created_at) AS prev_role
            FROM conversation_messages
        )
        SELECT id, use_case_id, role, prev_role
        FROM ordered
        WHERE role = prev_role AND prev_role IS NOT NULL
    """)
    if issues:
        print(f"\nWARNING: {len(issues)} consecutive same-role pairs still remain!")
        for r in issues:
            print(f"  {r['id']} ({r['role']}) in uc {r['use_case_id']}")
    else:
        print("Verification: no consecutive same-role messages remain.")

    # Check for remaining tool_use/tool_result blocks
    all_msgs = await conn.fetch(
        "SELECT id, role, content FROM conversation_messages ORDER BY created_at"
    )
    tool_use_count = 0
    tool_result_count = 0
    for r in all_msgs:
        content = r["content"]
        if isinstance(content, str):
            content = json.loads(content)
        if not isinstance(content, list):
            continue
        for b in content:
            if isinstance(b, dict):
                if b.get("type") == "tool_use":
                    tool_use_count += 1
                elif b.get("type") == "tool_result":
                    tool_result_count += 1
    print(f"Verification: {tool_use_count} tool_use blocks, {tool_result_count} tool_result blocks remaining.")

    await conn.close()


if __name__ == "__main__":
    try:
        asyncio.run(clean_history())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
