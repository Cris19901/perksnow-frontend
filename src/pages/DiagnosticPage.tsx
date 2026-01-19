// Temporary diagnostic page
// Visit: /diagnostic to see environment variables

export default function DiagnosticPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variable Diagnostic</h1>

      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5' }}>
        <h3>VITE_PAYSTACK_PUBLIC_KEY:</h3>
        <p style={{ wordBreak: 'break-all', color: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ? 'green' : 'red' }}>
          {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'UNDEFINED - NOT SET!'}
        </p>

        <h3>Status:</h3>
        <p>
          {import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
            ? '✅ Variable is loaded'
            : '❌ Variable is NOT loaded - Check Vercel settings'}
        </p>

        <h3>All VITE_ variables:</h3>
        <pre>{JSON.stringify(import.meta.env, null, 2)}</pre>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#fff3cd' }}>
        <h3>Fix Steps:</h3>
        <ol>
          <li>Go to Vercel Dashboard → Your Project</li>
          <li>Settings → Environment Variables</li>
          <li>Find VITE_PAYSTACK_PUBLIC_KEY</li>
          <li>Make sure "Production" checkbox is CHECKED ☑</li>
          <li>Go to Deployments → Latest → "..." → Redeploy</li>
          <li>UNCHECK "Use existing Build Cache"</li>
          <li>Wait 3 minutes and refresh this page</li>
        </ol>
      </div>
    </div>
  );
}
