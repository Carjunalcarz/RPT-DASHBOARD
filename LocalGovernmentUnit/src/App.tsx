import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from "./routes";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors expand={true} closeButton offset={90} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
