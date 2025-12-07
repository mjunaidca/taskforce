"use client";

import { useState, useEffect } from "react";

interface OAuthClient {
  id: string;
  clientId: string;
  clientSecret?: string;
  name: string | null;
  redirectUrls: string[];
  type: string | null;
  disabled: boolean | null;
  isTrusted?: boolean;
  metadata?: {
    token_endpoint_auth_method?: string;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    redirectUrls: "",
    scope: "openid profile email",
    clientType: "public" as "public" | "confidential",
  });
  const [createdClient, setCreatedClient] = useState<{
    clientId: string;
    clientSecret: string;
    isPublic: boolean;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<OAuthClient | null>(null);
  const [editRedirectUrls, setEditRedirectUrls] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await fetch("/api/admin/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    const isPublic = newClient.clientType === "public";
    const redirectUrls = newClient.redirectUrls.split("\n").filter(Boolean);

    try {
      // Use our custom registration endpoint that properly handles public clients
      const response = await fetch("/api/admin/clients/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClient.name,
          redirectUrls,
          scope: newClient.scope,
          clientType: newClient.clientType,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCreatedClient({
          clientId: result.client_id,
          clientSecret: result.client_secret || "",
          isPublic,
        });

        setNewClient({ name: "", redirectUrls: "", scope: "openid profile email", clientType: "public" });
        setShowCreateForm(false);

        // Reload clients from database
        await loadClients();
      } else {
        alert(result.error || "Failed to create OAuth client");
      }
    } catch (error) {
      console.error("Failed to create client:", error);
      alert("Failed to create OAuth client. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm(`Are you sure you want to delete the client "${clientId}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingClientId(clientId);

    try {
      const response = await fetch(`/api/admin/clients?clientId=${encodeURIComponent(clientId)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadClients();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete client");
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
      alert("Failed to delete client. Please try again.");
    } finally {
      setDeletingClientId(null);
    }
  };

  const handleEditClient = (client: OAuthClient) => {
    setEditingClient(client);
    const urls = Array.isArray(client.redirectUrls)
      ? client.redirectUrls.join("\n")
      : (client.redirectUrls as any).split(",").join("\n");
    setEditRedirectUrls(urls);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    setIsUpdating(true);

    try {
      const response = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: editingClient.clientId,
          redirectUrls: editRedirectUrls.split("\n").filter(Boolean),
        }),
      });

      if (response.ok) {
        setEditingClient(null);
        setEditRedirectUrls("");
        await loadClients();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update client");
      }
    } catch (error) {
      console.error("Failed to update client:", error);
      alert("Failed to update client. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">OAuth Clients</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          Register New Client
        </button>
      </div>

      {/* Client Created Success Modal */}
      {createdClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {createdClient.isPublic ? "Public" : "Confidential"} OAuth Client Created!
            </h3>

            {createdClient.isPublic ? (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-success font-medium mb-1">
                  Public Client (PKCE)
                </p>
                <p className="text-xs text-success/80">
                  No client secret needed. Uses PKCE for security. Perfect for SPAs, mobile apps, and browser-based apps.
                </p>
              </div>
            ) : (
              <div className="bg-secondary border border-secondary/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-secondary-foreground font-medium mb-1">
                  Confidential Client
                </p>
                <p className="text-xs text-secondary-foreground/80">
                  Save the client secret securely - it will not be shown again! Use for server-side apps only.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Client ID
                </label>
                <code className="block w-full p-2 bg-muted rounded text-sm break-all select-all text-foreground">
                  {createdClient.clientId}
                </code>
              </div>

              {!createdClient.isPublic && createdClient.clientSecret && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Client Secret
                  </label>
                  <code className="block w-full p-2 bg-muted rounded text-sm break-all select-all text-foreground">
                    {createdClient.clientSecret}
                  </code>
                </div>
              )}
            </div>

            {/* Usage Guide */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium text-foreground mb-2">Quick Start</h4>
              {createdClient.isPublic ? (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">1. Authorization Request (with PKCE):</strong></p>
                  <code className="block p-2 bg-card rounded text-xs overflow-x-auto border border-border">
                    GET /api/auth/oauth2/authorize?<br/>
                    &nbsp;&nbsp;client_id={createdClient.clientId}<br/>
                    &nbsp;&nbsp;&redirect_uri=YOUR_CALLBACK<br/>
                    &nbsp;&nbsp;&response_type=code<br/>
                    &nbsp;&nbsp;&scope=openid profile email<br/>
                    &nbsp;&nbsp;&code_challenge=GENERATED_CHALLENGE<br/>
                    &nbsp;&nbsp;&code_challenge_method=S256
                  </code>
                  <p><strong className="text-foreground">2. Token Exchange (no secret):</strong></p>
                  <code className="block p-2 bg-card rounded text-xs overflow-x-auto border border-border">
                    POST /api/auth/oauth2/token<br/>
                    grant_type=authorization_code<br/>
                    &code=AUTH_CODE<br/>
                    &redirect_uri=YOUR_CALLBACK<br/>
                    &client_id={createdClient.clientId}<br/>
                    &code_verifier=YOUR_VERIFIER
                  </code>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong className="text-foreground">1. Authorization Request:</strong></p>
                  <code className="block p-2 bg-card rounded text-xs overflow-x-auto border border-border">
                    GET /api/auth/oauth2/authorize?<br/>
                    &nbsp;&nbsp;client_id={createdClient.clientId}<br/>
                    &nbsp;&nbsp;&redirect_uri=YOUR_CALLBACK<br/>
                    &nbsp;&nbsp;&response_type=code<br/>
                    &nbsp;&nbsp;&scope=openid profile email
                  </code>
                  <p><strong className="text-foreground">2. Token Exchange (with secret):</strong></p>
                  <code className="block p-2 bg-card rounded text-xs overflow-x-auto border border-border">
                    POST /api/auth/oauth2/token<br/>
                    grant_type=authorization_code<br/>
                    &code=AUTH_CODE<br/>
                    &redirect_uri=YOUR_CALLBACK<br/>
                    &client_id={createdClient.clientId}<br/>
                    &client_secret=YOUR_SECRET
                  </code>
                </div>
              )}
            </div>

            <button
              onClick={() => setCreatedClient(null)}
              className="mt-6 w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              I've saved my credentials
            </button>
          </div>
        </div>
      )}

      {/* Create Client Form Modal */}
      {showCreateForm && !createdClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Register OAuth Client
            </h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient({ ...newClient, name: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
                  placeholder="My Application"
                />
              </div>

              {/* Client Type Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Client Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewClient({ ...newClient, clientType: "public" })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      newClient.clientType === "public"
                        ? "border-success bg-success/10"
                        : "border-border hover:border-muted-foreground bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full ${
                        newClient.clientType === "public" ? "bg-success" : "bg-muted"
                      }`} />
                      <span className="font-medium text-sm text-foreground">Public</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      SPAs, mobile apps, browser-based. Uses PKCE, no secret.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClient({ ...newClient, clientType: "confidential" })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      newClient.clientType === "confidential"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full ${
                        newClient.clientType === "confidential" ? "bg-primary" : "bg-muted"
                      }`} />
                      <span className="font-medium text-sm text-foreground">Confidential</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Server-side apps. Uses client secret.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Redirect URLs (one per line)
                </label>
                <textarea
                  value={newClient.redirectUrls}
                  onChange={(e) =>
                    setNewClient({ ...newClient, redirectUrls: e.target.value })
                  }
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
                  placeholder="https://myapp.com/callback"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Scopes
                </label>
                <input
                  type="text"
                  value={newClient.scope}
                  onChange={(e) =>
                    setNewClient({ ...newClient, scope: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-input text-foreground"
                  placeholder="openid profile email"
                />
              </div>

              {/* Skip Consent Note */}
              <div className="border border-primary/30 rounded-lg p-4 bg-primary/5">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-foreground">OAuth Consent Screen</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All dynamically registered clients will show a consent screen.
                      To skip consent for first-party apps, configure them as trusted clients in <code className="bg-muted px-1 py-0.5 rounded">auth.ts</code>.
                      See the pre-configured "RoboLearn Book Interface" client as an example.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? "Creating..." : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Edit OAuth Client
            </h3>

            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">Client:</span>{" "}
                <span className="text-foreground">{editingClient.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                <code className="bg-muted px-1 py-0.5 rounded">
                  {editingClient.clientId}
                </code>
              </div>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Redirect URLs (one per line)
                </label>
                <textarea
                  value={editRedirectUrls}
                  onChange={(e) => setEditRedirectUrls(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm bg-input text-foreground"
                  placeholder="https://myapp.com/callback&#10;http://localhost:3000/callback"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add localhost URLs for testing, remove them for production security
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClient(null);
                    setEditRedirectUrls("");
                  }}
                  className="flex-1 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients List */}
      <div className="bg-card rounded-lg shadow-card-elevated overflow-hidden overflow-x-auto border border-border">
        <table className="w-full min-w-max">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Application
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Client ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Redirect URLs
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No OAuth clients registered yet. Click "Register New Client" to create one.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                          />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                          {client.name || "Unnamed Client"}
                          {client.isTrusted && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground rounded">
                              Trusted
                            </span>
                          )}
                        </div>
                        {client.disabled && (
                          <span className="text-xs text-destructive">Disabled</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-muted px-2 py-1 rounded text-foreground">
                      {client.clientId}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      // Determine if public or confidential based on metadata or type
                      const isPublic = client.type === "public" ||
                        client.metadata?.token_endpoint_auth_method === "none";
                      return (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            isPublic
                              ? "bg-success/10 text-success"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isPublic ? "Public (PKCE)" : "Confidential"}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                      {Array.isArray(client.redirectUrls)
                        ? client.redirectUrls.join(", ")
                        : client.redirectUrls}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {client.isTrusted ? (
                      <span className="text-xs text-muted-foreground">Pre-configured</span>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleEditClient(client)}
                          className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.clientId)}
                          disabled={deletingClientId === client.clientId}
                          className="text-destructive hover:text-destructive/80 text-sm font-medium disabled:opacity-50 transition-colors"
                        >
                          {deletingClientId === client.clientId ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* OAuth Endpoints Info */}
      <div className="mt-8 bg-card rounded-lg shadow-card-elevated p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          OAuth 2.0 / OIDC Endpoints
        </h2>
        <div className="space-y-3">
          <EndpointRow
            name="Authorization Endpoint"
            url={`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3001"}/api/auth/oauth2/authorize`}
          />
          <EndpointRow
            name="Token Endpoint"
            url={`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3001"}/api/auth/oauth2/token`}
          />
          <EndpointRow
            name="UserInfo Endpoint"
            url={`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3001"}/api/auth/oauth2/userinfo`}
          />
          <EndpointRow
            name="OIDC Discovery"
            url={`${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3001"}/.well-known/openid-configuration`}
          />
        </div>
      </div>
    </div>
  );
}

function EndpointRow({ name, url }: { name: string; url: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{name}</span>
      <code className="text-sm bg-muted px-2 py-1 rounded text-foreground">
        {url}
      </code>
    </div>
  );
}
