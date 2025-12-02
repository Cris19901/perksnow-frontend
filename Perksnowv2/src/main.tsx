
  import { createRoot } from "react-dom/client";
  import { RouterProvider } from "react-router-dom";
  import { router } from "./routes";
  import "./index.css";
  import "./styles/globals.css";
  import { AuthProvider } from "./contexts/AuthContext";
  import { CartProvider } from "./contexts/CartContext";
  import { CurrencyProvider } from "./contexts/CurrencyContext";

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <CartProvider>
        <CurrencyProvider>
          <RouterProvider router={router} />
        </CurrencyProvider>
      </CartProvider>
    </AuthProvider>
  );
