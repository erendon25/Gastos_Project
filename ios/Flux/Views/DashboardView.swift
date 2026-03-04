import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @StateObject private var dashboardViewModel = DashboardViewModel()
    
    @State private var showingProUpgrade = false
    
    var body: some View {
        ZStack {
            Color(hex: "0a0a0a").ignoresSafeArea() // Fondo global estricto
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    
                    // Header Superior (Logo y Botones)
                    HStack {
                        Text("FLUX")
                            .font(.system(size: 24, weight: .black, design: .default))
                            .kerning(-1)
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        HStack(spacing: 16) {
                            Button(action: { /* Acción de exportar a CSV futuro */ }) {
                                Image(systemName: "square.and.arrow.down")
                                    .font(.system(size: 20))
                                    .foregroundColor(.gray)
                            }
                            Button(action: { /* Acción Settings futuros */ }) {
                                Image(systemName: "gearshape")
                                    .font(.system(size: 20))
                                    .foregroundColor(.gray)
                            }
                            Button(action: {
                                authViewModel.logout()
                            }) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 20))
                                    .foregroundColor(.gray)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 24)
                    
                    // Saludo de Perfil
                    HStack {
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color(hex: "262626"))
                                .frame(width: 32, height: 32)
                                .overlay(Image(systemName: "person.fill").foregroundColor(.gray).font(.system(size: 14)))
                                
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Hola,")
                                    .font(.system(size: 11))
                                    .foregroundColor(Color(hex: "666666"))
                                HStack(spacing: 6) {
                                    Text("Usuario")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                    
                                    Text("FREE")
                                        .font(.system(size: 9, weight: .bold))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(hex: "262626"))
                                        .foregroundColor(Color(hex: "666666"))
                                        .cornerRadius(6)
                                        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(hex: "333333"), lineWidth: 1))
                                }
                            }
                        }
                        
                        Spacer()
                        
                        // Botón MEJORAR como en la Web
                        // Botón MEJORAR como en la Web
                        Button(action: { showingProUpgrade = true }) {
                            HStack(spacing: 4) {
                                Image(systemName: "bolt.fill")
                                    .font(.system(size: 10))
                                Text("MEJORAR")
                                    .font(.system(size: 11, weight: .heavy))
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(LinearGradient(gradient: Gradient(colors: [Color(hex: "fbbf24"), Color(hex: "d97706")]), startPoint: .topLeading, endPoint: .bottomTrailing))
                            .foregroundColor(.black)
                            .cornerRadius(12)
                            .shadow(color: Color(hex: "fbbf24").opacity(0.2), radius: 8, y: 4)
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // Selector de Mes
                    HStack {
                        Button(action: {}) {
                            Image(systemName: "chevron.left")
                                .foregroundColor(.white)
                                .font(.system(size: 20))
                        }
                        Spacer()
                        VStack(spacing: 2) {
                            Text("Marzo 2026")
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundColor(.white)
                            Text("25 Feb - 24 Mar")
                                .font(.system(size: 10))
                                .foregroundColor(Color(hex: "666666"))
                        }
                        Spacer()
                        Button(action: {}) {
                            Image(systemName: "chevron.right")
                                .foregroundColor(.white)
                                .font(.system(size: 20))
                        }
                    }
                    .padding(.vertical, 12)
                    .padding(.horizontal, 16)
                    .background(Color.white.opacity(0.03))
                    .cornerRadius(16)
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.05), lineWidth: 1))
                    .padding(.horizontal, 20)

                    // Gran Tarjeta de Saldo Total
                    ZStack {
                        // El glow sutil arriba a la derecha
                        Circle()
                            .fill(Color(hex: "818cf8").opacity(0.1))
                            .frame(width: 100, height: 100)
                            .blur(radius: 40)
                            .offset(x: 100, y: -50)
                            
                        VStack(spacing: 8) {
                            Text("Saldo total disponible")
                                .font(.system(size: 14))
                                .foregroundColor(.gray) // text-secondary
                            Text("S/ \((dashboardViewModel.totalIncome - dashboardViewModel.totalExpenses), specifier: "%.2f")")
                                .font(.system(size: 40, weight: .heavy))
                                .kerning(-1)
                                .foregroundColor(.white)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .background(LinearGradient(gradient: Gradient(colors: [Color(hex:"1a1a1a"), Color(hex:"0a0a0a")]), startPoint: .topLeading, endPoint: .bottomTrailing))
                    .cornerRadius(24)
                    .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(hex: "222222"), lineWidth: 1))
                    .padding(.horizontal, 20)
                    
                    // Cajas Cortadas: Ingresos y Egresos
                    HStack(spacing: 16) {
                        // Caja Ingreso
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(spacing: 8) {
                                Image(systemName: "chart.line.uptrend.xyaxis")
                                    .font(.system(size: 16))
                                    .foregroundColor(Color(hex: "4ade80")) // income-color
                                Text("Ingresos")
                                    .font(.system(size: 12))
                                    .foregroundColor(.gray)
                            }
                            Text("S/ \(dashboardViewModel.totalIncome, specifier: "%.2f")")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                            Text("Mantener para ver")
                                .font(.system(size: 10))
                                .foregroundColor(.white.opacity(0.4))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(20)
                        .background(Color(hex: "101410"))
                        .cornerRadius(20)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(hex: "4ade80").opacity(0.05), lineWidth: 1))
                        
                        // Caja Egresos
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(spacing: 8) {
                                Image(systemName: "chart.line.downtrend.xyaxis")
                                    .font(.system(size: 16))
                                    .foregroundColor(Color(hex: "f87171")) // expense-color
                                Text("Egresos")
                                    .font(.system(size: 12))
                                    .foregroundColor(.gray)
                            }
                            Text("S/ \(dashboardViewModel.totalExpenses, specifier: "%.2f")")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Diarios: S/ \(dashboardViewModel.totalExpenses, specifier: "%.2f")")
                                    .font(.system(size: 10))
                                    .foregroundColor(.white.opacity(0.4))
                                Text("Fijos: S/ 0.0")
                                    .font(.system(size: 10))
                                    .foregroundColor(.white.opacity(0.4))
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(20)
                        .background(Color(hex: "141010"))
                        .cornerRadius(20)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(hex: "f87171").opacity(0.05), lineWidth: 1))
                    }
                    .padding(.horizontal, 20)
                    
                    // Caja de Meta de Ahorro
                    VStack(spacing: 14) {
                        HStack {
                            HStack(spacing: 8) {
                                Image(systemName: "banknote.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(Color(hex: "4ade80"))
                                Text("Meta de Ahorro")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            Spacer()
                            Button(action: {}) {
                                HStack(spacing: 4) {
                                    Image(systemName: "pencil")
                                        .font(.system(size: 10))
                                    Text("Editar")
                                        .font(.system(size: 12))
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.white.opacity(0.06))
                                .foregroundColor(Color(hex: "888888"))
                                .cornerRadius(8)
                            }
                        }
                        
                        Text("Toca \"Editar\" para definir tu meta de ahorro mensual")
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "555555"))
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 8)
                    }
                    .padding(20)
                    .background(LinearGradient(gradient: Gradient(colors: [Color(hex: "0d1a10"), Color(hex: "0a0a0a")]), startPoint: .topLeading, endPoint: .bottomTrailing))
                    .cornerRadius(20)
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(hex: "4ade80").opacity(0.12), lineWidth: 1))
                    .padding(.horizontal, 20)
                    
                    Rectangle().fill(.clear).frame(height: 120) // Espacio abajo para el Dock
                }
            }
            .onAppear {
                dashboardViewModel.fetchCurrentMonthData()
            }
            .sheet(isPresented: $showingProUpgrade) {
                // Asumiendo que has importado la vista o está en el proyecto
                VStack {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 50))
                        .foregroundColor(Color(hex: "fbbf24"))
                        .padding(.bottom, 10)
                    Text("Pásate a PRO")
                        .font(.title)
                        .bold()
                        .foregroundColor(.white)
                    Text("Integración MercadoPago en desarrollo...")
                        .foregroundColor(.gray)
                        .padding()
                    
                    Button("Cerrar") { showingProUpgrade = false }
                        .padding()
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(10)
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(hex: "0a0a0a").ignoresSafeArea())
            }
        }
    }
}
