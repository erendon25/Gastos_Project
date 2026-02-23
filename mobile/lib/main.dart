import 'dart:ui';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import 'models/transaction.dart';
import 'screens/login_screen.dart';
import 'widgets/settings_sheet.dart';
import 'widgets/add_expense_sheet.dart';
import 'voice_service.dart';
import 'services/firebase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: "AIzaSyB7gW6xeJ6E98rELYfjcKRnhLL6ZSWVUrw",
      appId: "1:665927620976:ios:04e6c701d4a04ed5b917b5", // This should be the iOS App ID, usually needs to be created in Firebase console
      messagingSenderId: "665927620976",
      projectId: "gastos-110bb",
      storageBucket: "gastos-110bb.firebasestorage.app",
      iosBundleId: "com.example.gastos_premium", // Matches the default bundle ID
    ),
  );
  runApp(const GastosApp());
}

class GastosApp extends StatelessWidget {
  const GastosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0A0A0A),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      home: StreamBuilder<User?>(
        stream: FirebaseAuth.instance.authStateChanges(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          if (snapshot.hasData) {
            return const DashboardScreen();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;
  final VoiceService _voiceService = VoiceService();
  final FirebaseService _firebaseService = FirebaseService();
  String _lastWords = '';
  DateTime _currentDate = DateTime.now();
  Map<String, dynamic>? _draftExpense;

  @override
  void initState() {
    super.initState();
    _voiceService.init();
  }

  void _listen() {
    if (!_voiceService.isListening) {
      _voiceService.startListening((val) async {
        setState(() {
          _lastWords = val;
        });
        
        final command = _voiceService.parseCommand(val);
        if (command != null) {
          await _firebaseService.addExpense(command);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                backgroundColor: const Color(0xFF1E1E1E),
                content: Text(
                  '✅ Guardado: S/ ${command['amount']} en ${command['category']}',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            );
          }
        }
      });
    } else {
      _voiceService.stopListening();
    }
  }

  void _changeMonth(int offset) {
    setState(() {
      _currentDate = DateTime(_currentDate.year, _currentDate.month + offset, 1);
    });
  }

  String _getMonthYearLabel() {
    final months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return '${months[_currentDate.month - 1]} ${_currentDate.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          SafeArea(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              children: [
                const SizedBox(height: 20),
                _buildHeader(),
                const SizedBox(height: 16),
                _buildMonthNavigation(),
                const SizedBox(height: 20),
                if (_lastWords.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Text(
                      'Voz: "$_lastWords"',
                      style: const TextStyle(fontStyle: FontStyle.italic, color: Colors.grey),
                    ),
                  ),
                
                StreamBuilder<List<TransactionModel>>(
                  stream: _firebaseService.getIncomes(_currentDate),
                  builder: (context, incomeSnap) {
                    return StreamBuilder<List<TransactionModel>>(
                      stream: _firebaseService.getExpenses(_currentDate),
                      builder: (context, expenseSnap) {
                        final incomes = incomeSnap.data ?? [];
                        final expenses = expenseSnap.data ?? [];
                        
                        double totalIncome = incomes.fold(0, (sum, item) => sum + item.amount);
                        double totalExpense = expenses.fold(0, (sum, item) => sum + item.amount);
                        double balance = totalIncome - totalExpense;

                        return Column(
                          children: [
                            _buildMainBalance(balance),
                            const SizedBox(height: 30),
                            _buildSummaryCards(totalIncome, totalExpense),
                          ],
                        );
                      },
                    );
                  }
                ),
                
                const SizedBox(height: 24),
                _buildStatsRow(),
                const SizedBox(height: 32),
                const Text('Actividad Reciente', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildRecentTransactions(),
                const SizedBox(height: 32),
                const Text('Tendencia Mensual', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildChart(),
                const SizedBox(height: 32),
                const Text('Deudas y Préstamos', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                _buildDetailedDebtProgress(),
                const SizedBox(height: 120),
              ],
            ),
          ),
          
          Positioned(
            bottom: 110,
            right: 24,
            child: FloatingActionButton(
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (context) => AddExpenseSheet(
                    initialDraft: _draftExpense,
                    onUpdateDraft: (draft) {
                      setState(() {
                        _draftExpense = draft;
                      });
                    },
                  ),
                );
              },
              backgroundColor: Colors.white,
              elevation: 10,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              child: const Icon(
                Icons.add, 
                color: Colors.black, 
                size: 32
              ),
            ),
          ),

          Positioned(
            bottom: 24, left: 20, right: 20,
            child: CustomDock(
              selectedIndex: _selectedIndex,
              onTap: (index) => setState(() => _selectedIndex = index),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hola, ${_firebaseService.currentUser?.displayName ?? 'Usuario'}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const Text('Tu resumen financiero', style: TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
        InkWell(
          onTap: () {
            showModalBottomSheet(
              context: context,
              backgroundColor: Colors.transparent,
              builder: (context) => SettingsSheet(),
            );
          },
          child: CircleAvatar(
            radius: 20, 
            backgroundColor: Colors.grey[900], 
            child: const Icon(Icons.person, color: Colors.white24, size: 20)
          ),
        ),
      ],
    );
  }

  Widget _buildMonthNavigation() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: () => _changeMonth(-1),
            icon: const Icon(Icons.chevron_left, color: Colors.white),
          ),
          Row(
            children: [
              const Icon(Icons.calendar_today, color: Color(0xFF818CF8), size: 16),
              const SizedBox(width: 8),
              Text(
                _getMonthYearLabel(),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          IconButton(
            onPressed: () => _changeMonth(1),
            icon: const Icon(Icons.chevron_right, color: Colors.white),
          ),
        ],
      ),
    );
  }

  Widget _buildMainBalance(double balance) {
    return Column(
      children: [
        const Text('Saldo total disponible', style: TextStyle(color: Colors.grey, fontSize: 13)),
        const SizedBox(height: 8),
        Text(
          'S/ ${balance.toStringAsFixed(2)}', 
          style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, letterSpacing: -1)
        ),
      ],
    );
  }

  Widget _buildSummaryCards(double totalIncome, double totalExpense) {
    return Row(
      children: [
        Expanded(child: _summaryCard('Ingresos', 'S/ ${totalIncome.toStringAsFixed(0)}', const Color(0xFF4ADE80))),
        const SizedBox(width: 12),
        Expanded(child: _summaryCard('Egresos', 'S/ ${totalExpense.toStringAsFixed(0)}', const Color(0xFFF87171))),
      ],
    );
  }

  Widget _summaryCard(String title, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161616), 
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(title == 'Ingresos' ? Icons.trending_up : Icons.trending_down, color: color, size: 14),
              const SizedBox(width: 6),
              Text(title, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _statItem('12', 'Registros'),
        _statItem('S/ 450', 'Ahorro'),
        _statItem('-8%', 'vs mes ant.', color: Colors.greenAccent),
      ],
    );
  }

  Widget _statItem(String value, String label, {Color? color}) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 10)),
      ],
    );
  }

  Widget _buildRecentTransactions() {
    return StreamBuilder<List<TransactionModel>>(
      stream: _firebaseService.getExpenses(_currentDate),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final transactions = snapshot.data ?? [];
        if (transactions.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text('No hay gastos este mes', style: TextStyle(color: Colors.grey)),
            ),
          );
        }
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: transactions.length > 5 ? 5 : transactions.length,
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final t = transactions[index];
            return TransactionItem(
              title: t.description,
              date: '${t.date.day} ${_getMonthName(t.date.month)}',
              amount: '- S/ ${t.amount.toStringAsFixed(2)}',
              category: t.category,
              emoji: t.categoryEmoji,
            );
          },
        );
      },
    );
  }

  String _getMonthName(int month) {
    const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return names[month - 1];
  }

  Widget _buildChart() {
    return Container(
      height: 100, 
      decoration: BoxDecoration(
        color: const Color(0xFF151515), 
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.02)),
      ),
      padding: const EdgeInsets.all(16),
      child: BarChart(BarChartData(
        gridData: FlGridData(show: false), 
        titlesData: FlTitlesData(show: false), 
        borderData: FlBorderData(show: false),
        barGroups: [
          BarChartGroupData(x: 0, barRods: [BarChartRodData(toY: 5, color: Colors.grey[800], width: 12, borderRadius: BorderRadius.circular(4))]),
          BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 8, color: Colors.grey[800], width: 12, borderRadius: BorderRadius.circular(4))]),
          BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 4, color: Colors.grey[800], width: 12, borderRadius: BorderRadius.circular(4))]),
          BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 10, color: const Color(0xFF818CF8), width: 12, borderRadius: BorderRadius.circular(4))]),
        ],
      )),
    );
  }

  Widget _buildDetailedDebtProgress() {
    return StreamBuilder<List<DebtModel>>(
      stream: _firebaseService.getDebts(),
      builder: (context, snapshot) {
        final debts = snapshot.data ?? [];
        if (debts.isEmpty) {
          return const Center(
            child: Text('No hay deudas registradas', style: TextStyle(color: Colors.grey, fontSize: 12)),
          );
        }

        final debt = debts.first; // Show the first one for now
        final totalDebt = debt.totalLoanAmount ?? 0;
        final paidAmount = totalDebt - (debt.remainingAmount ?? 0);
        final progress = totalDebt > 0 ? (paidAmount / totalDebt) : 0.0;

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A1A), 
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withOpacity(0.05)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(debt.description, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Vence: ${debt.dueDate?.day} ${_getMonthName(debt.dueDate?.month ?? 1)}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: Colors.redAccent.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                    child: Text(debt.paid ? 'Pagado' : 'Pendiente', style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${(progress * 100).toStringAsFixed(1)}% pagado', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  Text('Faltan: S/ ${debt.remainingAmount?.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: progress, 
                backgroundColor: Colors.grey[800], 
                color: Colors.white, 
                minHeight: 8, 
                borderRadius: BorderRadius.circular(4)
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _debtSmallInfo('Cuota Actual', 'S/ ${debt.amount.toStringAsFixed(2)}'),
                  ),
                  Container(width: 1, height: 24, color: Colors.white10),
                  Expanded(
                    child: _debtSmallInfo('Monto Total', 'S/ ${totalDebt.toStringAsFixed(2)}'),
                  ),
                ],
              ),
            ],
          ),
        );
      }
    );
  }

  Widget _debtSmallInfo(String label, String value) {
    return Column(
      children: [
        Text(label.toUpperCase(), style: const TextStyle(color: Colors.grey, fontSize: 9, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class TransactionItem extends StatelessWidget {
  final String title;
  final String date;
  final String amount;
  final String category;
  final String? emoji;

  const TransactionItem({
    super.key, 
    required this.title, 
    required this.date, 
    required this.amount, 
    required this.category,
    this.emoji,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.white05)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05), 
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Center(
                    child: Text(
                      emoji ?? '📦', 
                      style: const TextStyle(fontSize: 20)
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start, 
                    children: [
                      Text(
                        title, 
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(category, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
              Text(date, style: const TextStyle(color: Colors.grey, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }
}

class CustomDock extends StatelessWidget {
  final int selectedIndex;
  final Function(int) onTap;
  const CustomDock({super.key, required this.selectedIndex, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 76, 
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04), 
        borderRadius: BorderRadius.circular(28), 
        border: Border.all(color: Colors.white.withOpacity(0.1)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 40, offset: const Offset(0, 10))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withOpacity(0.05),
                  Colors.white.withOpacity(0.0),
                ],
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _navItem(0, Icons.home_filled, 'Inicio'),
                _navItem(1, Icons.account_balance_wallet_rounded, 'Gastos'),
                _navItem(2, Icons.repeat_rounded, 'Fijos'),
                _navItem(3, Icons.landmark_rounded, 'Deudas'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label) {
    final bool isSelected = selectedIndex == index;
    return GestureDetector(
      onTap: () => onTap(index),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white.withOpacity(0.05) : Colors.transparent, 
          borderRadius: BorderRadius.circular(16)
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, color: isSelected ? Colors.white : Colors.white24, size: 22),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.white24, fontSize: 9, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        ]),
      ),
    );
  }
}
