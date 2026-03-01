#!/usr/bin/env python3
"""Repair orphaned tool_use blocks in conversation_messages.

Walks every use-case's conversation history in order and ensures that every
assistant message containing tool_use blocks is followed by a user message
with matching tool_result blocks.

When an assistant message has orphaned tool_use blocks (no matching
tool_result in the next message), the repair strategy is:
  - Strip the tool_use blocks, keeping only text blocks.
  - If the message becomes empty, delete it entirely.

This is a one-time repair script. After running, the write-path fix in
_process_agent_stream prevents new orphaned tool_use blocks from being saved.

Usage (from the backend container):
    python scripts/repair_conversation_history.py
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


def parse_content(raw):
    """Parse content field — could be JSON string or already a list."""
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw
    return raw


async def repair():
    conn = await get_connection()
    tx = conn.transaction()
    await tx.start()

    print("=== Conversation History Repair — Orphaned tool_use Blocks ===\n")

    # Load all messages grouped by use_case, ordered by created_at.
    rows = await conn.fetch(
        "SELECT id, use_case_id, role, content, created_at "
        "FROM conversation_messages "
        "ORDER BY use_case_id, created_at"
    )
    print(f"Total messages in DB: {len(rows)}\n")

    # Group by use_case_id.
    use_cases: dict[str, list] = {}
    for row in rows:
        uc = str(row["use_case_id"])
        use_cases.setdefault(uc, []).append(row)

    total_stripped = 0
    total_deleted = 0
    delete_ids: list[str] = []
    update_ids: list[tuple[str, str]] = []  # (id, new_content_json)

    for uc_id, msgs in use_cases.items():
        for i, msg in enumerate(msgs):
            role = msg["role"]
            if role != "assistant":
                continue

            content = parse_content(msg["content"])
            if not isinstance(content, list):
                continue

            # Collect tool_use IDs in this assistant message.
            tool_use_ids = {
                b["id"]
                for b in content
                if isinstance(b, dict) and b.get("type") == "tool_use" and "id" in b
            }
            if not tool_use_ids:
                continue

            # Check if the next message is a user message with matching tool_results.
            answered_ids: set[str] = set()
            if i + 1 < len(msgs):
                next_msg = msgs[i + 1]
                if next_msg["role"] == "user":
                    next_content = parse_content(next_msg["content"])
                    if isinstance(next_content, list):
                        answered_ids = {
                            b.get("tool_use_id")
                            for b in next_content
                            if isinstance(b, dict) and b.get("type") == "tool_result"
                        }

            orphaned = tool_use_ids - answered_ids
            if not orphaned:
                continue  # All tool_use blocks are properly answered.

            # Orphaned tool_use blocks found — strip them.
            text_blocks = [
                b for b in content
                if isinstance(b, dict) and b.get("type") != "tool_use"
            ]

            msg_id = str(msg["id"])
            if text_blocks:
                stripped_count = len(content) - len(text_blocks)
                print(
                    f"  [uc {uc_id[:8]}] assistant {msg_id[:8]}: "
                    f"stripped {stripped_count} orphaned tool_use block(s), "
                    f"{len(text_blocks)} text block(s) kept"
                )
                update_ids.append((msg_id, json.dumps(text_blocks)))
                total_stripped += stripped_count
            else:
                print(
                    f"  [uc {uc_id[:8]}] assistant {msg_id[:8]}: "
                    f"all {len(content)} blocks were orphaned tool_use — DELETING"
                )
                delete_ids.append(msg_id)
                total_deleted += 1
                total_stripped += len(content)

    # Apply updates.
    for msg_id, new_content in update_ids:
        await conn.execute(
            "UPDATE conversation_messages SET content = $1 WHERE id = $2::uuid",
            new_content,
            msg_id,
        )

    # Apply deletions.
    if delete_ids:
        await conn.execute(
            "DELETE FROM conversation_messages WHERE id = ANY($1::uuid[])",
            delete_ids,
        )

    await tx.commit()

    print(f"\n--- Summary ---")
    print(f"Messages with orphaned tool_use blocks repaired: {len(update_ids)}")
    print(f"Messages deleted (tool_use only, no text): {total_deleted}")
    print(f"Total orphaned tool_use blocks stripped: {total_stripped}")

    # Verification pass — confirm no orphaned tool_use remains.
    rows = await conn.fetch(
        "SELECT id, use_case_id, role, content, created_at "
        "FROM conversation_messages "
        "ORDER BY use_case_id, created_at"
    )
    print(f"\nMessages remaining: {len(rows)}")

    use_cases_v: dict[str, list] = {}
    for row in rows:
        uc = str(row["use_case_id"])
        use_cases_v.setdefault(uc, []).append(row)

    remaining_orphans = 0
    for uc_id, msgs in use_cases_v.items():
        for i, msg in enumerate(msgs):
            if msg["role"] != "assistant":
                continue
            content = parse_content(msg["content"])
            if not isinstance(content, list):
                continue
            tool_use_ids = {
                b["id"]
                for b in content
                if isinstance(b, dict) and b.get("type") == "tool_use" and "id" in b
            }
            if not tool_use_ids:
                continue
            answered_ids: set[str] = set()
            if i + 1 < len(msgs):
                next_msg = msgs[i + 1]
                if next_msg["role"] == "user":
                    next_content = parse_content(next_msg["content"])
                    if isinstance(next_content, list):
                        answered_ids = {
                            b.get("tool_use_id")
                            for b in next_content
                            if isinstance(b, dict) and b.get("type") == "tool_result"
                        }
            orphaned = tool_use_ids - answered_ids
            if orphaned:
                remaining_orphans += len(orphaned)
                print(f"  WARNING: {msg['id']} still has {len(orphaned)} orphaned tool_use block(s)")

    if remaining_orphans == 0:
        print("Verification PASSED: no orphaned tool_use blocks remain.")
    else:
        print(f"Verification FAILED: {remaining_orphans} orphaned tool_use block(s) remain!")

    await conn.close()


if __name__ == "__main__":
    try:
        asyncio.run(repair())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
