import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    // Ocultaremos el TabBar por defecto de Apple para hacer nuestro propio "Dock" flotante
    init() {
        UITabBar.appearance().isHidden = true
    }
    
    var body: some View {
        ZStack {
            Color(hex: "0a0a0a").ignoresSafeArea() // Fondo global
            
            // Contenido de las pestañas
            TabView(selection: $selectedTab) {
                DashboardView()
                    .tag(0)
                
                TransactionsListView(title: "Gastos Diarios", subtitle: "Historial de consumos normales")
                    .tag(1)
                
                TransactionsListView(title: "Gastos Fijos", subtitle: "Alquiler, servicios y mensualidades")
                    .tag(2)
                
                TransactionsListView(title: "Deudas", subtitle: "Préstamos bancarios y cronogramas")
                    .tag(3)
                
                TransactionsListView(title: "Suscripciones", subtitle: "Servicios digitales")
                    .tag(4)
            }
            .animation(.easeInOut, value: selectedTab)
            
            // Nuestro Dock Flotante (Custom Tab Bar)
            VStack {
                Spacer()
                CustomDock(selectedTab: $selectedTab)
            }
        }
    }
}

struct CustomDock: View {
    @Binding var selectedTab: Int
    
    let icons = ["house.fill", "creditcard.fill", "repeat", "building.columns.fill", "tv.fill"]
    let labels = ["Inicio", "Gastos", "Fijos", "Deudas", "Digital"]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<5) { index in
                Button(action: {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                        selectedTab = index
                    }
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: icons[index])
                            .font(.system(size: 22, weight: selectedTab == index ? .bold : .regular))
                            .foregroundColor(selectedTab == index ? .black : Color.white.opacity(0.6))
                            .frame(width: 48, height: 48)
                            .background(selectedTab == index ? Color(hex: "fca311") : Color.clear)
                            .clipShape(Circle())
                            .offset(y: selectedTab == index ? -15 : 0)
                            .shadow(color: selectedTab == index ? Color(hex: "fca311").opacity(0.5) : .clear, radius: 10, y: 5)
                        
                        if selectedTab == index {
                            Text(labels[index])
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white)
                                .offset(y: -5)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 8)
        .frame(height: 74)
        .background(Color(hex: "14213d"))
        .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .shadow(color: Color.black.opacity(0.6), radius: 30, y: 15)
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
    }
}
