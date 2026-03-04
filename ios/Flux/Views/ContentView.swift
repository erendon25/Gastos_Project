import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea() // Fondo general
            
            if authViewModel.isAuthenticated {
                MainTabView()
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
            } else {
                LoginView()
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: authViewModel.isAuthenticated)
    }
}
