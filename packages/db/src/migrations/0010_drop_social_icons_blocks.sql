-- Data fix (custom migration, no schema change): `social_icons` blocks are a
-- retired type. Their icons moved to the social_network table long ago, the
-- block has no config schema, and the public page only filtered the rows out
-- client-side. Backup import already drops the type; remove the stored rows.
-- Click rows for them cascade (link_click.block_id ON DELETE cascade).
DELETE FROM `block` WHERE `type` = 'social_icons';
