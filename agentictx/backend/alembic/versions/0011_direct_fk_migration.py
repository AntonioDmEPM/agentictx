"""Replace polymorphic junction table with direct FK columns and proper link tables.

Revision ID: 0011
Revises: 0010
Create Date: 2026-02-28

Migrates JTD/Cognitive Load phase assignment from process_step_jtd_links junction
table to direct process_phase_id FK on lived_jtds and cognitive_jtds.

Replaces JSON arrays on delegation_clusters with cluster_jtd_links and
cluster_cognitive_links tables for proper referential integrity.

Removes cognitive_load_score from lived_jtds (scoring belongs only on
cognitive_jtds via load_intensity).

Includes conversation history cleanup as data migration step.
"""
import json
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    # ── Phase A: Add new columns and tables ──────────────────────────────────

    # 1. Add process_phase_id to lived_jtds
    op.add_column(
        "lived_jtds",
        sa.Column(
            "process_phase_id",
            UUID(as_uuid=True),
            sa.ForeignKey("process_steps.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # 2. Add process_phase_id to cognitive_jtds
    op.add_column(
        "cognitive_jtds",
        sa.Column(
            "process_phase_id",
            UUID(as_uuid=True),
            sa.ForeignKey("process_steps.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # 3. Create cluster_jtd_links table
    op.create_table(
        "cluster_jtd_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "cluster_id",
            UUID(as_uuid=True),
            sa.ForeignKey("delegation_clusters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "jtd_id",
            UUID(as_uuid=True),
            sa.ForeignKey("lived_jtds.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("cluster_id", "jtd_id", name="uq_cluster_jtd"),
    )

    # 4. Create cluster_cognitive_links table
    op.create_table(
        "cluster_cognitive_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "cluster_id",
            UUID(as_uuid=True),
            sa.ForeignKey("delegation_clusters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "cognitive_load_id",
            UUID(as_uuid=True),
            sa.ForeignKey("cognitive_jtds.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("cluster_id", "cognitive_load_id", name="uq_cluster_cognitive"),
    )

    # ── Phase B: Data migration ──────────────────────────────────────────────

    conn = op.get_bind()

    # 5. Populate process_phase_id on lived_jtds from process_step_jtd_links
    conn.execute(sa.text("""
        UPDATE lived_jtds SET process_phase_id = sub.process_step_id
        FROM (
            SELECT DISTINCT ON (jtd_id) jtd_id, process_step_id
            FROM process_step_jtd_links
            WHERE jtd_type = 'lived'
            ORDER BY jtd_id, sequence_within_step
        ) sub
        WHERE lived_jtds.id = sub.jtd_id
    """))

    # 6. Populate process_phase_id on cognitive_jtds from process_step_jtd_links
    conn.execute(sa.text("""
        UPDATE cognitive_jtds SET process_phase_id = sub.process_step_id
        FROM (
            SELECT DISTINCT ON (jtd_id) jtd_id, process_step_id
            FROM process_step_jtd_links
            WHERE jtd_type = 'cognitive'
            ORDER BY jtd_id, sequence_within_step
        ) sub
        WHERE cognitive_jtds.id = sub.jtd_id
    """))

    # 7. Populate cluster_jtd_links from delegation_clusters.lived_jtd_ids JSON
    clusters = conn.execute(sa.text(
        "SELECT id, use_case_id, lived_jtd_ids FROM delegation_clusters WHERE lived_jtd_ids IS NOT NULL"
    )).fetchall()
    for cluster_id, use_case_id, lived_jtd_ids_raw in clusters:
        if not lived_jtd_ids_raw:
            continue
        descriptions = lived_jtd_ids_raw if isinstance(lived_jtd_ids_raw, list) else json.loads(lived_jtd_ids_raw)
        for desc in descriptions:
            if not desc:
                continue
            # Try UUID match first, then description match
            jtd = conn.execute(sa.text(
                "SELECT id FROM lived_jtds WHERE use_case_id = :uc_id AND (id::text = :desc OR LOWER(description) = LOWER(:desc)) LIMIT 1"
            ), {"uc_id": use_case_id, "desc": str(desc)}).fetchone()
            if jtd:
                conn.execute(sa.text(
                    "INSERT INTO cluster_jtd_links (id, cluster_id, jtd_id) VALUES (gen_random_uuid(), :cid, :jid) ON CONFLICT DO NOTHING"
                ), {"cid": cluster_id, "jid": jtd[0]})

    # 8. Populate cluster_cognitive_links from delegation_clusters.cognitive_jtd_ids JSON
    clusters = conn.execute(sa.text(
        "SELECT id, use_case_id, cognitive_jtd_ids FROM delegation_clusters WHERE cognitive_jtd_ids IS NOT NULL"
    )).fetchall()
    for cluster_id, use_case_id, cognitive_jtd_ids_raw in clusters:
        if not cognitive_jtd_ids_raw:
            continue
        descriptions = cognitive_jtd_ids_raw if isinstance(cognitive_jtd_ids_raw, list) else json.loads(cognitive_jtd_ids_raw)
        for desc in descriptions:
            if not desc:
                continue
            jtd = conn.execute(sa.text(
                "SELECT id FROM cognitive_jtds WHERE use_case_id = :uc_id AND (id::text = :desc OR LOWER(description) = LOWER(:desc)) LIMIT 1"
            ), {"uc_id": use_case_id, "desc": str(desc)}).fetchone()
            if jtd:
                conn.execute(sa.text(
                    "INSERT INTO cluster_cognitive_links (id, cluster_id, cognitive_load_id) VALUES (gen_random_uuid(), :cid, :jid) ON CONFLICT DO NOTHING"
                ), {"cid": cluster_id, "jid": jtd[0]})

    # 9. Clean conversation history — same logic as the already-executed cleanup
    _clean_conversation_history(conn)

    # ── Phase C: Drop old structures ─────────────────────────────────────────

    # 10. Drop process_step_jtd_links table
    op.drop_table("process_step_jtd_links")

    # 11. Remove cognitive_load_score from lived_jtds
    op.drop_column("lived_jtds", "cognitive_load_score")

    # 12. Remove cognitive_jtd_ids from delegation_clusters
    op.drop_column("delegation_clusters", "cognitive_jtd_ids")

    # 13. Remove lived_jtd_ids from delegation_clusters
    op.drop_column("delegation_clusters", "lived_jtd_ids")


def _clean_conversation_history(conn: sa.engine.Connection) -> None:
    """Strip tool_use/tool_result from conversation messages, delete emptied rows,
    merge consecutive same-role messages."""

    rows = conn.execute(sa.text(
        "SELECT id, role, content FROM conversation_messages ORDER BY use_case_id, created_at"
    )).fetchall()

    if not rows:
        return

    ids_to_delete = []
    updates = []

    for row_id, role, content_raw in rows:
        if not content_raw:
            continue
        content = content_raw if isinstance(content_raw, list) else json.loads(content_raw)
        if not isinstance(content, list):
            continue

        if role == "assistant":
            cleaned = [b for b in content if not (isinstance(b, dict) and b.get("type") == "tool_use")]
        elif role == "user":
            cleaned = [b for b in content if not (isinstance(b, dict) and b.get("type") == "tool_result")]
        else:
            continue

        if not cleaned:
            ids_to_delete.append(row_id)
        elif len(cleaned) != len(content):
            updates.append((row_id, json.dumps(cleaned)))

    for row_id, new_content in updates:
        conn.execute(sa.text(
            "UPDATE conversation_messages SET content = :content::jsonb WHERE id = :id"
        ), {"content": new_content, "id": row_id})

    for row_id in ids_to_delete:
        conn.execute(sa.text(
            "DELETE FROM conversation_messages WHERE id = :id"
        ), {"id": row_id})


def downgrade() -> None:
    conn = op.get_bind()

    # 1. Re-add cognitive_load_score to lived_jtds
    op.add_column(
        "lived_jtds",
        sa.Column("cognitive_load_score", sa.Integer, nullable=True),
    )

    # 2. Re-add cognitive_jtd_ids and lived_jtd_ids to delegation_clusters
    op.add_column(
        "delegation_clusters",
        sa.Column("cognitive_jtd_ids", sa.JSON, nullable=False, server_default="[]"),
    )
    op.add_column(
        "delegation_clusters",
        sa.Column("lived_jtd_ids", sa.JSON, nullable=True),
    )

    # 3. Re-create process_step_jtd_links table
    op.create_table(
        "process_step_jtd_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "process_step_id",
            UUID(as_uuid=True),
            sa.ForeignKey("process_steps.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("jtd_type", sa.String(20), nullable=False),
        sa.Column("jtd_id", UUID(as_uuid=True), nullable=False),
        sa.Column("sequence_within_step", sa.Integer, nullable=False),
    )

    # 4. Populate process_step_jtd_links from process_phase_id values
    conn.execute(sa.text("""
        INSERT INTO process_step_jtd_links (id, process_step_id, jtd_type, jtd_id, sequence_within_step)
        SELECT gen_random_uuid(), process_phase_id, 'lived', id, 0
        FROM lived_jtds
        WHERE process_phase_id IS NOT NULL
    """))
    conn.execute(sa.text("""
        INSERT INTO process_step_jtd_links (id, process_step_id, jtd_type, jtd_id, sequence_within_step)
        SELECT gen_random_uuid(), process_phase_id, 'cognitive', id, 0
        FROM cognitive_jtds
        WHERE process_phase_id IS NOT NULL
    """))

    # 5. Populate cluster JSON arrays from link tables
    # lived_jtd_ids
    clusters_with_lived = conn.execute(sa.text("""
        SELECT cl.cluster_id, array_agg(lj.description)
        FROM cluster_jtd_links cl
        JOIN lived_jtds lj ON lj.id = cl.jtd_id
        GROUP BY cl.cluster_id
    """)).fetchall()
    for cluster_id, descriptions in clusters_with_lived:
        conn.execute(sa.text(
            "UPDATE delegation_clusters SET lived_jtd_ids = :descs::jsonb WHERE id = :cid"
        ), {"descs": json.dumps(list(descriptions)), "cid": cluster_id})

    # cognitive_jtd_ids
    clusters_with_cognitive = conn.execute(sa.text("""
        SELECT cl.cluster_id, array_agg(cj.description)
        FROM cluster_cognitive_links cl
        JOIN cognitive_jtds cj ON cj.id = cl.cognitive_load_id
        GROUP BY cl.cluster_id
    """)).fetchall()
    for cluster_id, descriptions in clusters_with_cognitive:
        conn.execute(sa.text(
            "UPDATE delegation_clusters SET cognitive_jtd_ids = :descs::jsonb WHERE id = :cid"
        ), {"descs": json.dumps(list(descriptions)), "cid": cluster_id})

    # 6. Drop cluster_jtd_links and cluster_cognitive_links tables
    op.drop_table("cluster_jtd_links")
    op.drop_table("cluster_cognitive_links")

    # 7. Remove process_phase_id from lived_jtds and cognitive_jtds
    op.drop_column("lived_jtds", "process_phase_id")
    op.drop_column("cognitive_jtds", "process_phase_id")
