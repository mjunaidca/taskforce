# GitHub Actions Patterns for Cloud Deployment

## Selective Build Pattern

Only build images when their source changes:

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      sso: ${{ steps.filter.outputs.sso }}
      web: ${{ steps.filter.outputs.web }}
      helm: ${{ steps.filter.outputs.helm }}
      any_service: ${{ steps.filter.outputs.api == 'true' || steps.filter.outputs.sso == 'true' || steps.filter.outputs.web == 'true' }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'apps/api/**'
            sso:
              - 'apps/sso/**'
            web:
              - 'apps/web/**'
            helm:
              - 'infrastructure/helm/**'

  build-api:
    needs: changes
    if: needs.changes.outputs.api == 'true' || github.event_name == 'workflow_dispatch'
    # ... build steps

  deploy:
    needs: [changes, build-api, build-sso, build-web]
    if: |
      always() &&
      (needs.changes.outputs.any_service == 'true' || needs.changes.outputs.helm == 'true') &&
      !contains(needs.*.result, 'failure')
```

## Next.js Build Args Pattern

```yaml
- name: Build and push (web with build args)
  if: matrix.name == 'web'
  uses: docker/build-push-action@v5
  with:
    context: apps/web
    file: apps/web/Dockerfile
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
    build-args: |
      NEXT_PUBLIC_SSO_URL=https://sso.${{ vars.DOMAIN }}
      NEXT_PUBLIC_API_URL=https://api.${{ vars.DOMAIN }}
      NEXT_PUBLIC_APP_URL=https://${{ vars.DOMAIN }}
      NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://${{ vars.DOMAIN }}/api/auth/callback
```

## Multi-Cloud Provider Pattern

```yaml
# For Azure AKS
- name: Azure Login
  if: ${{ vars.CLOUD_PROVIDER == 'azure' }}
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Get AKS credentials
  if: ${{ vars.CLOUD_PROVIDER == 'azure' }}
  run: |
    az aks get-credentials \
      --resource-group ${{ vars.AZURE_RESOURCE_GROUP }} \
      --name ${{ vars.AZURE_CLUSTER_NAME }}

# For GKE
- name: Authenticate to GKE
  if: ${{ vars.CLOUD_PROVIDER == 'gke' }}
  uses: google-github-actions/auth@v1
  with:
    credentials_json: ${{ secrets.GCP_CREDENTIALS }}

- name: Get GKE credentials
  if: ${{ vars.CLOUD_PROVIDER == 'gke' }}
  uses: google-github-actions/get-gke-credentials@v1
  with:
    cluster_name: ${{ vars.GKE_CLUSTER_NAME }}
    location: ${{ vars.GKE_CLUSTER_ZONE }}

# For any provider with kubeconfig
- name: Set kubeconfig
  if: ${{ vars.CLOUD_PROVIDER == 'kubeconfig' }}
  run: |
    mkdir -p ~/.kube
    echo "${{ secrets.KUBECONFIG }}" | base64 -d > ~/.kube/config
```

## Helm Deploy with Secrets Pattern

```yaml
- name: Deploy with Helm
  run: |
    helm upgrade --install myapp ./infrastructure/helm/myapp \
      --namespace myapp \
      --values infrastructure/helm/myapp/values-cloud.yaml \
      --set global.imageRegistry="${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}" \
      --set global.imageTag="${{ github.sha }}" \
      --set global.imagePullSecrets[0].name=ghcr-secret \
      --set "managedServices.neon.ssoDatabase=${{ secrets.NEON_SSO_DATABASE_URL }}" \
      --set "managedServices.upstash.host=${{ secrets.UPSTASH_REDIS_HOST }}" \
      --set "sso.env.BETTER_AUTH_SECRET=${{ secrets.BETTER_AUTH_SECRET }}" \
      --set "sso.smtp.user=${{ secrets.SMTP_USER }}" \
      --set "sso.smtp.password=${{ secrets.SMTP_PASSWORD }}" \
      --set "global.domain=${{ vars.DOMAIN }}" \
      --wait \
      --timeout 10m
```

## GHCR Pull Secret Pattern

```yaml
- name: Create GHCR pull secret
  run: |
    kubectl create secret docker-registry ghcr-secret \
      --namespace myapp \
      --docker-server=ghcr.io \
      --docker-username=${{ github.actor }} \
      --docker-password=${{ secrets.GITHUB_TOKEN }} \
      --dry-run=client -o yaml | kubectl apply -f -
```

## Job Summary Pattern

```yaml
- name: Post deployment URLs
  run: |
    echo "## Deployment Complete!" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### Services Built" >> $GITHUB_STEP_SUMMARY
    echo "| Service | Built |" >> $GITHUB_STEP_SUMMARY
    echo "|---------|-------|" >> $GITHUB_STEP_SUMMARY
    echo "| API | ${{ needs.changes.outputs.api == 'true' && '✅' || '⏭️ skipped' }} |" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "### URLs" >> $GITHUB_STEP_SUMMARY
    echo "| Web | https://${{ vars.DOMAIN }} |" >> $GITHUB_STEP_SUMMARY
```

## Secrets vs Variables

### Use Secrets For:
- Database connection strings
- API keys (OpenAI, etc.)
- Auth secrets (BETTER_AUTH_SECRET)
- Passwords (SMTP, Redis)
- Cloud credentials (AZURE_CREDENTIALS)

### Use Variables For:
- Domain name
- Cloud provider type
- Resource group names
- Cluster names
- Ingress class
