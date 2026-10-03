import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/novafin_repository.dart';
import '../core/theme.dart';
import '../widgets/generic_list_screen.dart';

Widget buildBanksScreen() => GenericListScreen(
      title: 'Banks',
      eyebrow: 'Banking',
      endpoint: 'banks',
      addButtonLabel: 'New Bank',
      emptyMessage: 'No banks added yet.',
      columns: [
        ColumnSpec('Name', (r) => r['name'].toString()),
        ColumnSpec('Branch', (r) => r['branch']?.toString() ?? '—'),
        ColumnSpec('Account No.', (r) => r['account_no']?.toString() ?? '—'),
        ColumnSpec('Opening Balance', (r) => moneyCell(r['opening_balance']), numeric: true),
      ],
      buildFormFields: (repo) async => const [
        FieldSpec(key: 'name', label: 'Bank Name', required: true),
        FieldSpec(key: 'branch', label: 'Branch'),
        FieldSpec(key: 'account_no', label: 'Account Number'),
        FieldSpec(key: 'opening_balance', label: 'Opening Balance', type: FieldType.number, initialValue: 0),
      ],
    );

Widget buildBranchesScreen() => GenericListScreen(
      title: 'Branches',
      eyebrow: 'Company',
      endpoint: 'branches',
      addButtonLabel: 'New Branch',
      emptyMessage: 'No branches added yet.',
      columns: [
        ColumnSpec('Name', (r) => r['name'].toString()),
        ColumnSpec('City', (r) => r['city']?.toString() ?? '—'),
      ],
      buildFormFields: (repo) async => const [
        FieldSpec(key: 'name', label: 'Branch Name', required: true),
        FieldSpec(key: 'city', label: 'City'),
      ],
    );

Widget buildDepartmentsScreen() => GenericListScreen(
      title: 'Departments',
      eyebrow: 'HR',
      endpoint: 'departments',
      addButtonLabel: 'New Department',
      emptyMessage: 'No departments yet.',
      columns: [ColumnSpec('Name', (r) => r['name'].toString())],
      buildFormFields: (repo) async => const [FieldSpec(key: 'name', label: 'Department Name', required: true)],
    );

Widget buildDesignationsScreen() => GenericListScreen(
      title: 'Designations',
      eyebrow: 'HR',
      endpoint: 'designations',
      addButtonLabel: 'New Designation',
      emptyMessage: 'No designations yet.',
      columns: [ColumnSpec('Name', (r) => r['name'].toString())],
      buildFormFields: (repo) async => const [FieldSpec(key: 'name', label: 'Designation Name', required: true)],
    );

Widget buildAccountsScreen() => GenericListScreen(
      title: 'Chart of Accounts',
      eyebrow: 'Accounting',
      endpoint: 'accounts',
      addButtonLabel: 'New Account',
      emptyMessage: 'No ledger accounts yet.',
      columns: [
        ColumnSpec('Code', (r) => r['code'].toString()),
        ColumnSpec('Name', (r) => r['name'].toString()),
        ColumnSpec('Type', (r) => r['account_type'].toString()),
      ],
      buildFormFields: (repo) async => const [
        FieldSpec(key: 'code', label: 'Account Code', required: true),
        FieldSpec(key: 'name', label: 'Account Name', required: true),
        FieldSpec(
          key: 'account_type',
          label: 'Type',
          type: FieldType.dropdown,
          required: true,
          options: [
            DropdownOption('asset', 'Asset'),
            DropdownOption('liability', 'Liability'),
            DropdownOption('equity', 'Equity'),
            DropdownOption('income', 'Income'),
            DropdownOption('expense', 'Expense'),
          ],
        ),
        FieldSpec(key: 'opening_amount', label: 'Opening Balance (optional)', type: FieldType.number, initialValue: 0),
        FieldSpec(
          key: 'opening_side',
          label: 'Opening Side',
          type: FieldType.dropdown,
          initialValue: 'debit',
          options: [DropdownOption('debit', 'Debit'), DropdownOption('credit', 'Credit')],
        ),
      ],
    );

Widget buildFiscalYearsScreen() => GenericListScreen(
      title: 'Fiscal Years',
      eyebrow: 'Administration',
      endpoint: 'fiscal-years',
      addButtonLabel: 'New Fiscal Year',
      emptyMessage: 'No fiscal years set up yet.',
      columns: [
        ColumnSpec('Label', (r) => r['label'].toString()),
        ColumnSpec('Start', (r) => dateCell(r['start_date'])),
        ColumnSpec('End', (r) => dateCell(r['end_date'])),
        ColumnSpec('Status', (r) => r['status'].toString()),
        ColumnSpec('Net Profit', (r) => r['net_profit_snapshot'] == null ? '—' : moneyCell(r['net_profit_snapshot']), numeric: true),
      ],
      rowActions: (context, row, refresh) => [
        if (row['status'] != 'closed')
          TextButton(
            onPressed: () async {
              final repo = context.read<NovaFinRepository>();
              final confirmed = await showDialog<bool>(
                context: context,
                builder: (dialogContext) => AlertDialog(
                  title: const Text('Close Fiscal Year'),
                  content: Text(
                    'Closing "${row['label']}" permanently blocks new entries dated within ${row['start_date']} to ${row['end_date']}. Continue?',
                  ),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
                    ElevatedButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Close Year')),
                  ],
                ),
              );
              if (confirmed == true) {
                await repo.createRaw('fiscal-years/${row['id']}/close', {});
                refresh();
              }
            },
            child: const Text('Close Year'),
          ),
      ],
      buildFormFields: (repo) async => const [
        FieldSpec(key: 'label', label: 'Label (e.g. FY2026)', required: true),
        FieldSpec(key: 'start_date', label: 'Start Date', type: FieldType.date, required: true),
        FieldSpec(key: 'end_date', label: 'End Date', type: FieldType.date, required: true),
        FieldSpec(key: 'is_active', label: 'Mark as active fiscal year', type: FieldType.bool_, initialValue: false),
      ],
    );

Widget buildAuditLogScreen() => GenericListScreen(
      title: 'Audit Log',
      eyebrow: 'Administration',
      endpoint: 'audit-log',
      emptyMessage: 'No NovaFin activity recorded yet.',
      columns: [
        ColumnSpec('When', (r) => r['created_at'].toString().replaceFirst('T', ' ').substring(0, 19)),
        ColumnSpec('User', (r) => r['actor']?.toString() ?? '—'),
        ColumnSpec('Action', (r) => r['action'].toString()),
        ColumnSpec('Entity', (r) => r['entity_type'].toString()),
      ],
    );

Widget buildIncomeVouchersScreen() => GenericListScreen(
      title: 'Income Vouchers',
      eyebrow: 'Accounting',
      endpoint: 'income-vouchers',
      addButtonLabel: 'New Voucher',
      emptyMessage: 'No income vouchers yet.',
      columns: [
        ColumnSpec('Code', (r) => r['code'].toString()),
        ColumnSpec('Category', (r) => r['category_name']?.toString() ?? '—'),
        ColumnSpec('Date', (r) => r['voucher_date'].toString()),
        ColumnSpec('Amount', (r) => moneyCell(r['amount']), numeric: true),
        ColumnSpec('Note', (r) => r['note']?.toString() ?? '—'),
      ],
      buildFormFields: (repo) async {
        final categories = await repo.listRaw('income-categories');
        return [
          FieldSpec(
            key: 'category_id',
            label: 'Category',
            type: FieldType.dropdown,
            required: true,
            options: [for (final c in categories) DropdownOption(c['id'] as String, c['name'].toString())],
          ),
          const FieldSpec(key: 'voucher_date', label: 'Date', type: FieldType.date, required: true),
          const FieldSpec(key: 'amount', label: 'Amount', type: FieldType.number, required: true),
          const FieldSpec(key: 'method', label: 'Method', initialValue: 'cash'),
          const FieldSpec(key: 'note', label: 'Note'),
        ];
      },
    );

Widget buildExpenseVouchersScreen() => GenericListScreen(
      title: 'Expense Vouchers',
      eyebrow: 'Accounting',
      endpoint: 'expense-vouchers',
      addButtonLabel: 'New Voucher',
      emptyMessage: 'No expense vouchers yet.',
      columns: [
        ColumnSpec('Code', (r) => r['code'].toString()),
        ColumnSpec('Category', (r) => r['category_name']?.toString() ?? '—'),
        ColumnSpec('Date', (r) => r['voucher_date'].toString()),
        ColumnSpec('Amount', (r) => moneyCell(r['amount']), numeric: true),
        ColumnSpec('Note', (r) => r['note']?.toString() ?? '—'),
      ],
      buildFormFields: (repo) async {
        final categories = await repo.listRaw('expense-categories');
        return [
          FieldSpec(
            key: 'category_id',
            label: 'Category',
            type: FieldType.dropdown,
            required: true,
            options: [for (final c in categories) DropdownOption(c['id'] as String, c['name'].toString())],
          ),
          const FieldSpec(key: 'voucher_date', label: 'Date', type: FieldType.date, required: true),
          const FieldSpec(key: 'amount', label: 'Amount', type: FieldType.number, required: true),
          const FieldSpec(key: 'method', label: 'Method', initialValue: 'cash'),
          const FieldSpec(key: 'note', label: 'Note'),
        ];
      },
    );

Widget buildCapitalScreen() => GenericListScreen(
      title: 'Capital / Drawings',
      eyebrow: 'Banking',
      endpoint: 'capital-moves',
      addButtonLabel: 'New Entry',
      emptyMessage: 'No capital/drawings entries yet.',
      columns: [
        ColumnSpec('Code', (r) => r['code'].toString()),
        ColumnSpec('Kind', (r) => r['kind'].toString()),
        ColumnSpec('Date', (r) => r['move_date'].toString()),
        ColumnSpec('Amount', (r) => moneyCell(r['amount']), numeric: true),
        ColumnSpec('Note', (r) => r['note']?.toString() ?? '—'),
      ],
      buildFormFields: (repo) async => const [
        FieldSpec(
          key: 'kind',
          label: 'Kind',
          type: FieldType.dropdown,
          required: true,
          options: [DropdownOption('capital', 'Capital (owner puts money in)'), DropdownOption('drawings', 'Drawings (owner takes money out)')],
        ),
        FieldSpec(key: 'move_date', label: 'Date', type: FieldType.date, required: true),
        FieldSpec(key: 'amount', label: 'Amount', type: FieldType.number, required: true),
        FieldSpec(key: 'method', label: 'Method', initialValue: 'cash'),
        FieldSpec(key: 'note', label: 'Note'),
      ],
    );

Widget buildContraScreen() => GenericListScreen(
      title: 'Contra (Cash ↔ Bank)',
      eyebrow: 'Banking',
      endpoint: 'contras',
      addButtonLabel: 'New Transfer',
      emptyMessage: 'No contra transfers yet.',
      columns: [
        ColumnSpec('Code', (r) => r['code'].toString()),
        ColumnSpec('From', (r) => r['from_method'].toString()),
        ColumnSpec('To', (r) => r['to_method'].toString()),
        ColumnSpec('Date', (r) => r['contra_date'].toString()),
        ColumnSpec('Amount', (r) => moneyCell(r['amount']), numeric: true),
      ],
      buildFormFields: (repo) async => const [
        FieldSpec(key: 'from_method', label: 'From (e.g. bank)', required: true),
        FieldSpec(key: 'to_method', label: 'To (e.g. cash)', required: true),
        FieldSpec(key: 'contra_date', label: 'Date', type: FieldType.date, required: true),
        FieldSpec(key: 'amount', label: 'Amount', type: FieldType.number, required: true),
        FieldSpec(key: 'note', label: 'Note'),
      ],
    );

Widget buildCreditNotesScreen() => GenericListScreen(
      title: 'Credit Notes',
      eyebrow: 'Sales',
      endpoint: 'credit-notes',
      addButtonLabel: 'New Credit Note',
      emptyMessage: 'No credit notes yet.',
      columns: [
        ColumnSpec('Code', (r) => r['code'].toString()),
        ColumnSpec('Customer', (r) => r['customer_name']?.toString() ?? '—'),
        ColumnSpec('Date', (r) => r['note_date'].toString()),
        ColumnSpec('Amount', (r) => moneyCell(r['amount']), numeric: true),
        ColumnSpec('Reason', (r) => r['reason']?.toString() ?? '—'),
      ],
      buildFormFields: (repo) async {
        final customers = await repo.listRaw('customers');
        return [
          FieldSpec(
            key: 'customer_id',
            label: 'Customer',
            type: FieldType.dropdown,
            required: true,
            options: [for (final c in customers) DropdownOption(c['id'] as String, c['name'].toString())],
          ),
          const FieldSpec(key: 'note_date', label: 'Date', type: FieldType.date, required: true),
          const FieldSpec(key: 'amount', label: 'Amount', type: FieldType.number, required: true),
          const FieldSpec(key: 'reason', label: 'Reason'),
        ];
      },
    );

Widget buildChequesScreen() => GenericListScreen(
      title: 'Cheques',
      eyebrow: 'Banking',
      endpoint: 'cheques',
      addButtonLabel: 'New Cheque',
      emptyMessage: 'No cheques recorded yet.',
      columns: [
        ColumnSpec('Cheque No.', (r) => r['cheque_no'].toString()),
        ColumnSpec('Bank', (r) => r['bank_name']?.toString() ?? '—'),
        ColumnSpec('Kind', (r) => r['kind'].toString()),
        ColumnSpec('Party', (r) => r['party_name']?.toString() ?? '—'),
        ColumnSpec('Due Date', (r) => r['due_date'].toString()),
        ColumnSpec('Amount', (r) => moneyCell(r['amount']), numeric: true),
        ColumnSpec('Status', (r) => r['status'].toString()),
      ],
      buildFormFields: (repo) async {
        final banks = await repo.listRaw('banks');
        return [
          FieldSpec(
            key: 'bank_id',
            label: 'Bank',
            type: FieldType.dropdown,
            options: [for (final b in banks) DropdownOption(b['id'] as String, b['name'].toString())],
          ),
          const FieldSpec(key: 'cheque_no', label: 'Cheque No.', required: true),
          const FieldSpec(
            key: 'kind',
            label: 'Kind',
            type: FieldType.dropdown,
            required: true,
            options: [DropdownOption('inward', 'Inward (received)'), DropdownOption('outward', 'Outward (issued)')],
          ),
          const FieldSpec(key: 'party_name', label: 'Party name'),
          const FieldSpec(key: 'cheque_date', label: 'Cheque Date', type: FieldType.date, required: true),
          const FieldSpec(key: 'due_date', label: 'Due Date', type: FieldType.date, required: true),
          const FieldSpec(key: 'amount', label: 'Amount', type: FieldType.number, required: true),
        ];
      },
      rowActions: (context, row, refresh) => [
        if (row['status'] != 'cleared')
          IconButton(
            tooltip: 'Mark cleared',
            icon: const Icon(Icons.check_circle_outline, size: 18, color: NfColors.success),
            onPressed: () async {
              await context.read<NovaFinRepository>().patchRaw('cheques/${row['id']}/status?new_status=cleared');
              refresh();
            },
          ),
        if (row['status'] != 'bounced')
          IconButton(
            tooltip: 'Mark bounced',
            icon: const Icon(Icons.cancel_outlined, size: 18, color: NfColors.danger),
            onPressed: () async {
              await context.read<NovaFinRepository>().patchRaw('cheques/${row['id']}/status?new_status=bounced');
              refresh();
            },
          ),
      ],
    );
