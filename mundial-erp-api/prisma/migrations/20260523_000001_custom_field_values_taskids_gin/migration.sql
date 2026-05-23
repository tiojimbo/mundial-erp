CREATE INDEX IF NOT EXISTS idx_cfv_value_json_task_ids
ON custom_field_values
USING GIN ((value_json -> 'taskIds'));
