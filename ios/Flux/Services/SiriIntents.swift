import SwiftUI
import AppIntents

/// Intent (Comando de Siri) para agregar un gasto.
/// Cuando instales la app, puedes decir: "Oye Siri, agrega 50 en pasajes en Flux".
struct AddExpenseIntent: AppIntent {
    
    // Título visible del Intent en Atajos (Shortcuts) y Siri.
    static var title: LocalizedStringResource = "Agregar un gasto"
    
    // Siri preguntará por esto si no se lo dices de inmediato.
    @Parameter(title: "Monto", requestValueDialog: "¿Cuánto gastaste?")
    var amount: Double
    
    // La categoría es opcional, si no la dices Siri la pone como nula o un default.
    @Parameter(title: "Categoría", default: "Varios")
    var category: String

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        
        // Aquí debes enlazar con tu Firebase Manager para guardar en la nube
        // Ejemplo ficticio: await FirebaseManager.shared.saveExpense(amount: amount, category: category)
        
        let response = "Hecho, he guardado un gasto de \(String(format: "%.2f", amount)) en \(category)."
        
        // La respuesta hablada por Siri
        return .result(value: response, dialog: IntentDialog(stringLiteral: response))
    }
}

/// Registrar las frases que Siri entenderá para abrir Flux
struct FluxShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddExpenseIntent(),
            phrases: [
                "Agrega un gasto en \(.applicationName)",
                "Pagar \(\.$amount) de \(\.$category) en \(.applicationName)",
                "Registra \(\.$amount) en \(.applicationName)"
            ],
            shortTitle: "Agregar Gasto",
            systemImageName: "dollarsign.circle.fill"
        )
    }
}
