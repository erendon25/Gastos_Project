import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    @State private var showingAddExpense = false
    
    init() {
        UITabBar.appearance().isHidden = true
    }
    
    var body: some View {
        ZStack {
            Color(hex: "0a0a0a").ignoresSafeArea()
            
            TabView(selection: $selectedTab) {
                DashboardView()
                    .tag(0)
                
                TransactionsListView(title: "Gastos Diarios", subtitle: "Historial de consumos normales")
                    .tag(1)
                
                TransactionsListView(title: "Gastos Fijos", subtitle: "Alquiler, servicios y mensualidades")
                    .tag(2)
                    
                TransactionsListView(title: "Suscripciones", subtitle: "Servicios digitales")
                    .tag(3)
                
                TransactionsListView(title: "Deudas", subtitle: "Préstamos bancarios y cronogramas")
                    .tag(4)
                
                TransactionsListView(title: "Ingresos", subtitle: "Todos los ingresos de este mes")
                    .tag(5)
            }
            // Remove TabView implicit animation and rely on our CustomDock animations
            
            // "Floating Navbar + Plus Button"
            VStack(spacing: 0) {
                Spacer()
                
                // Botón Flotante "+" (FAB)
                HStack {
                    Spacer()
                    Button(action: {
                        showingAddExpense = true
                    }) {
                        Image(systemName: "plus")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(.black)
                            .frame(width: 56, height: 56)
                            .background(
                                LinearGradient(colors: [.white, Color(white: 0.88)], startPoint: .topLeading, endPoint: .bottomTrailing)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                            .shadow(color: Color.black.opacity(0.4), radius: 12, y: 8)
                    }
                    .padding(.trailing, 24)
                }
                .padding(.bottom, 24)
                
                CustomDock(selectedTab: $selectedTab)
            }
            .ignoresSafeArea(.keyboard)
        }
        .sheet(isPresented: $showingAddExpense) {
            AddExpenseView()
        }
    }
}

// 1. DOCK SHAPE CON RECORTE PARA EL TAB SELECCIONADO
struct LiquidDockShape: Shape {
    var activeIndex: CGFloat
    var tabCount: CGFloat
    // offset es para animar el cambio
    var animatableData: CGFloat {
        get { activeIndex }
        set { activeIndex = newValue }
    }
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let cornerRadius: CGFloat = 24
        
        // Empieza esquina sup der
        path.move(to: CGPoint(x: rect.maxX - cornerRadius, y: 0))
        path.addArc(center: CGPoint(x: rect.maxX - cornerRadius, y: cornerRadius), radius: cornerRadius, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
        
        // linea derecha a abajo der
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - cornerRadius))
        path.addArc(center: CGPoint(x: rect.maxX - cornerRadius, y: rect.maxY - cornerRadius), radius: cornerRadius, startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
        
        // linea abajo hasta abajo izq
        path.addLine(to: CGPoint(x: cornerRadius, y: rect.maxY))
        path.addArc(center: CGPoint(x: cornerRadius, y: rect.maxY - cornerRadius), radius: cornerRadius, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
        
        // linea izq a arriba izq
        path.addLine(to: CGPoint(x: 0, y: cornerRadius))
        path.addArc(center: CGPoint(x: cornerRadius, y: cornerRadius), radius: cornerRadius, startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        
        // Dibujar el hueco (recorte) calculado
        let padding: CGFloat = 4
        let innerWidth = rect.width - (padding * 2)
        let tabWidth = innerWidth / tabCount
        // El centro (x) del tab seleccionado:
        let cx = padding + (tabWidth * activeIndex) + (tabWidth / 2)
        
        // Dibuja la parte superior recta antes del hueco
        path.addLine(to: CGPoint(x: cx - 48, y: 0))
        
        // El Recorte (Curvas de Bezier calcadas de la SVG web)
        path.addCurve(to: CGPoint(x: cx, y: 38),
                      control1: CGPoint(x: cx - 24, y: 0),
                      control2: CGPoint(x: cx - 28, y: 38))
        
        path.addCurve(to: CGPoint(x: cx + 48, y: 0),
                      control1: CGPoint(x: cx + 28, y: 38),
                      control2: CGPoint(x: cx + 24, y: 0))
        
        path.addLine(to: CGPoint(x: rect.maxX - cornerRadius, y: 0))
        
        return path
    }
}

// 2. EL DOCK PERSONALIZADO
struct CustomDock: View {
    @Binding var selectedTab: Int
    
    let icons = ["house.fill", "creditcard.fill", "repeat", "tv.fill", "building.columns.fill", "chart.line.uptrend.xyaxis"]
    let labels = ["Inicio", "Gastos", "Fijos", "Digital", "Deudas", "Ingresos"]
    let tabCount: Int = 6
    
    var body: some View {
        GeometryReader { proxy in
            ZStack {
                // El Background con Hueco (Color idéntico a web)
                LiquidDockShape(activeIndex: CGFloat(selectedTab), tabCount: CGFloat(tabCount))
                    .fill(Color(hex: "14213d"))
                    .shadow(color: Color.black.opacity(0.6), radius: 32, y: 16)
                
                // Los Iconos Flotantes
                HStack(spacing: 0) {
                    ForEach(0..<tabCount, id: \.self) { index in
                        Button(action: {
                            withAnimation(.spring(response: 0.45, dampingFraction: 0.72)) {
                                selectedTab = index
                            }
                        }) {
                            ZStack {
                                // Circulo Flotante Naranja de Selección
                                Circle()
                                    .fill(Color(hex: "fca311"))
                                    .frame(width: 48, height: 48)
                                    .shadow(color: Color(hex: "fca311").opacity(0.4), radius: 8, y: 4)
                                    .offset(y: selectedTab == index ? -34 : 0) // Sube al hueco
                                    .opacity(selectedTab == index ? 1 : 0) // Ocular si no seleccionado
                                    .scaleEffect(selectedTab == index ? 1.05 : 0.8) // "Pop" effect
                                
                                // El Icono
                                Image(systemName: icons[index])
                                    .font(.system(size: 22, weight: selectedTab == index ? .bold : .medium))
                                    // Negro si seleccionado, blanco pálido si no
                                    .foregroundColor(selectedTab == index ? .black : Color(hex: "e5e5e5"))
                                    .offset(y: selectedTab == index ? -34 : 0) // Sube con el círculo
                                
                                // Nombre (Solo visible si está seleccionado, animado)
                                if selectedTab == index {
                                    Text(labels[index])
                                        .font(.system(size: 10, weight: .heavy))
                                        .foregroundColor(.white)
                                        .offset(y: 20) // Se queda en la barra visible
                                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                                }
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
        }
        .frame(height: 74)
        .padding(.horizontal, 16)
        .padding(.bottom, 32)
    }
}

// Temporary inline view until we link the standalone files in Xcode project
struct AddExpenseView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(Color(hex: "fca311"))
            
            Text("Añadir Gasto o Ingreso")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
            
            Text("Pantalla de formulario en construcción. Aquí podrás registrar tus consumos rápidamente.")
                .font(.system(size: 14))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Button(action: { presentationMode.wrappedValue.dismiss() }) {
                Text("Cerrar")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(hex: "fca311"))
                    .cornerRadius(12)
                    .padding(.horizontal, 40)
            }
            .padding(.top, 20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "0a0a0a").ignoresSafeArea())
    }
}
