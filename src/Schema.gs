/** Draft only: Phase 1 will implement setup and validation for these sheets. */
var SCHEMA_DRAFT_ = Object.freeze({
  Items: ['item_id', 'item_code', 'name', 'category', 'unit', 'minimum_stock', 'active', 'created_at'],
  Departments: ['department_id', 'name', 'active'],
  Operators: ['operator_id', 'name', 'active', 'role'],
  Movements: ['movement_id', 'request_id', 'payload_hash', 'occurred_date', 'created_at',
    'item_id', 'item_code_snapshot', 'item_name_snapshot', 'unit_snapshot', 'type',
    'quantity_delta', 'department_id', 'department_name_snapshot', 'source',
    'reference_no', 'requester', 'operator_id', 'operator_name_snapshot', 'note',
    'reverses_movement_id']
});

var POC_HEADERS_ = ['probe_id', 'request_id', 'created_at', 'kind'];
var POC_KIND_ = 'CONNECTION_CHECK';
