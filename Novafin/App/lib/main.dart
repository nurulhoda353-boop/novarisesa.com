import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'core/auth_state.dart';
import 'core/cms_users_repository.dart';
import 'core/novafin_repository.dart';
import 'core/theme.dart';
import 'features/accounting/assets_screen.dart';
import 'features/accounting/journal_vouchers_screen.dart';
import 'features/admin/company_settings_screen.dart';
import 'features/admin/opening_balance_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/settings/user_roles_screen.dart';
import 'features/banking/bank_reconciliation_screen.dart';
import 'features/banking/cash_move_screen.dart';
import 'features/customers/customers_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/generic_screens.dart';
import 'features/hr/employees_screen.dart';
import 'features/hr/salary_slips_screen.dart';
import 'features/invoices/invoices_screen.dart';
import 'features/items/items_screen.dart';
import 'features/purchases/purchases_screen.dart';
import 'features/purchasing/rfq_screen.dart';
import 'features/reports/reports_screen.dart';
import 'features/vendors/vendors_screen.dart';
import 'widgets/app_shell.dart';
import 'widgets/document_screen.dart';

void main() {
  runApp(const NovaFinApp());
}

class NovaFinApp extends StatefulWidget {
  const NovaFinApp({super.key});

  @override
  State<NovaFinApp> createState() => _NovaFinAppState();
}

class _NovaFinAppState extends State<NovaFinApp> {
  late final ApiClient _apiClient;
  late final AuthState _authState;
  late final NovaFinRepository _repository;
  late final CmsUsersRepository _usersRepository;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _apiClient = ApiClient();
    _authState = AuthState(_apiClient);
    _repository = NovaFinRepository(_apiClient);
    _usersRepository = CmsUsersRepository(_apiClient);
    _router = _buildRouter(_authState);
  }

  GoRouter _buildRouter(AuthState auth) {
    return GoRouter(
      refreshListenable: auth,
      initialLocation: '/dashboard',
      redirect: (context, state) {
        final signedIn = auth.status == AuthStatus.signedIn;
        final onLogin = state.matchedLocation == '/login';
        if (!signedIn && !onLogin) return '/login';
        if (signedIn && onLogin) return '/dashboard';
        return null;
      },
      routes: [
        GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
        ShellRoute(
          builder: (context, state, child) => AppShell(currentPath: state.matchedLocation, child: child),
          routes: [
            GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
            GoRoute(path: '/items', builder: (context, state) => const ItemsScreen()),

            // Sales
            GoRoute(path: '/customers', builder: (context, state) => const CustomersScreen()),
            GoRoute(
              path: '/quotes',
              builder: (context, state) => const DocumentScreen(
                title: 'Quotes',
                eyebrow: 'Quote',
                listEndpoint: 'quotes',
                createEndpoint: 'quotes',
                partyLabel: 'Customer',
                partyEndpoint: 'customers',
                partyKey: 'customer_id',
                dateLabel: 'Date',
                dateKey: 'quote_date',
              ),
            ),
            GoRoute(
              path: '/orders',
              builder: (context, state) => const DocumentScreen(
                title: 'Orders',
                eyebrow: 'Order',
                listEndpoint: 'orders',
                createEndpoint: 'orders',
                partyLabel: 'Customer',
                partyEndpoint: 'customers',
                partyKey: 'customer_id',
                dateLabel: 'Date',
                dateKey: 'order_date',
                secondaryRefLabel: 'Quote',
                secondaryRefEndpoint: 'quotes',
                secondaryRefKey: 'quote_id',
              ),
            ),
            GoRoute(
              path: '/deliveries',
              builder: (context, state) => const DocumentScreen(
                title: 'Deliveries',
                eyebrow: 'Delivery',
                listEndpoint: 'deliveries',
                createEndpoint: 'deliveries',
                partyLabel: 'Customer',
                partyEndpoint: 'customers',
                partyKey: 'customer_id',
                dateLabel: 'Date',
                dateKey: 'delivery_date',
                hasRate: false,
                hasVat: false,
                secondaryRefLabel: 'Order',
                secondaryRefEndpoint: 'orders',
                secondaryRefKey: 'order_id',
              ),
            ),
            GoRoute(path: '/invoices', builder: (context, state) => const InvoicesScreen()),
            GoRoute(
              path: '/sales-returns',
              builder: (context, state) => const DocumentScreen(
                title: 'Sales Returns',
                eyebrow: 'Sales Return',
                listEndpoint: 'sales-returns',
                createEndpoint: 'sales-returns',
                partyLabel: 'Customer',
                partyEndpoint: 'customers',
                partyKey: 'customer_id',
                dateLabel: 'Date',
                dateKey: 'return_date',
                secondaryRefLabel: 'Invoice',
                secondaryRefEndpoint: 'invoices',
                secondaryRefKey: 'invoice_id',
              ),
            ),
            GoRoute(path: '/credit-notes', builder: (context, state) => buildCreditNotesScreen()),

            // Purchases
            GoRoute(path: '/vendors', builder: (context, state) => const VendorsScreen()),
            GoRoute(path: '/rfqs', builder: (context, state) => const RfqScreen()),
            GoRoute(
              path: '/purchase-orders',
              builder: (context, state) => const DocumentScreen(
                title: 'Purchase Orders',
                eyebrow: 'Purchase Order',
                listEndpoint: 'purchase-orders',
                createEndpoint: 'purchase-orders',
                partyLabel: 'Vendor',
                partyEndpoint: 'vendors',
                partyKey: 'vendor_id',
                dateLabel: 'Date',
                dateKey: 'order_date',
                rateFromCost: true,
              ),
            ),
            GoRoute(path: '/purchase-bills', builder: (context, state) => const PurchasesScreen()),
            GoRoute(
              path: '/purchase-returns',
              builder: (context, state) => const DocumentScreen(
                title: 'Purchase Returns',
                eyebrow: 'Purchase Return',
                listEndpoint: 'purchase-returns',
                createEndpoint: 'purchase-returns',
                partyLabel: 'Vendor',
                partyEndpoint: 'vendors',
                partyKey: 'vendor_id',
                dateLabel: 'Date',
                dateKey: 'return_date',
                rateFromCost: true,
                secondaryRefLabel: 'Purchase Bill',
                secondaryRefEndpoint: 'purchases',
                secondaryRefKey: 'purchase_id',
              ),
            ),

            // Banking & Cash
            GoRoute(path: '/banks', builder: (context, state) => buildBanksScreen()),
            GoRoute(path: '/branches', builder: (context, state) => buildBranchesScreen()),
            GoRoute(path: '/cash-receipts', builder: (context, state) => const CashMoveScreen(kind: 'receipt')),
            GoRoute(path: '/cash-payments', builder: (context, state) => const CashMoveScreen(kind: 'payment')),
            GoRoute(path: '/cheques', builder: (context, state) => buildChequesScreen()),
            GoRoute(path: '/capital', builder: (context, state) => buildCapitalScreen()),
            GoRoute(path: '/contra', builder: (context, state) => buildContraScreen()),
            GoRoute(path: '/bank-reconciliation', builder: (context, state) => const BankReconciliationScreen()),

            // Accounts
            GoRoute(path: '/accounts', builder: (context, state) => buildAccountsScreen()),
            GoRoute(path: '/journal-vouchers', builder: (context, state) => const JournalVouchersScreen()),
            GoRoute(path: '/income-vouchers', builder: (context, state) => buildIncomeVouchersScreen()),
            GoRoute(path: '/expense-vouchers', builder: (context, state) => buildExpenseVouchersScreen()),
            GoRoute(path: '/assets', builder: (context, state) => const AssetsScreen()),

            // HR
            GoRoute(path: '/departments', builder: (context, state) => buildDepartmentsScreen()),
            GoRoute(path: '/designations', builder: (context, state) => buildDesignationsScreen()),
            GoRoute(path: '/employees', builder: (context, state) => const EmployeesScreen()),
            GoRoute(path: '/salary-slips', builder: (context, state) => const SalarySlipsScreen()),

            // Reports
            GoRoute(path: '/reports', builder: (context, state) => const ReportsScreen()),

            // Settings
            GoRoute(path: '/user-roles', builder: (context, state) => const UserRolesScreen()),
            GoRoute(path: '/admin', builder: (context, state) => const CompanySettingsScreen()),
            GoRoute(path: '/fiscal-years', builder: (context, state) => buildFiscalYearsScreen()),
            GoRoute(path: '/opening-balance', builder: (context, state) => const OpeningBalanceScreen()),
            GoRoute(path: '/audit-log', builder: (context, state) => buildAuditLogScreen()),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthState>.value(value: _authState),
        Provider<NovaFinRepository>.value(value: _repository),
        Provider<CmsUsersRepository>.value(value: _usersRepository),
      ],
      child: MaterialApp.router(
        title: 'NovaFin',
        debugShowCheckedModeBanner: false,
        theme: NfTheme.light(),
        routerConfig: _router,
      ),
    );
  }
}
