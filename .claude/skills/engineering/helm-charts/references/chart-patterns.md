# Helm Chart Patterns

## Conditional Resources

Include resources only when enabled:

```yaml
{{- if .Values.postgresql.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "taskflow.fullname" . }}-db-credentials
# ...
{{- end }}
```

## Loops for Multiple Services

```yaml
{{- range $name, $service := .Values.services }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ include "taskflow.fullname" $ }}-{{ $name }}
spec:
  ports:
    - port: {{ $service.port }}
{{- end }}
```

## Default Values with Fallback

```yaml
replicas: {{ .Values.replicaCount | default 1 }}
image: "{{ .Values.image.repository | default "nginx" }}:{{ .Values.image.tag | default "latest" }}"
```

## Environment Variables from ConfigMap

```yaml
envFrom:
  - configMapRef:
      name: {{ include "taskflow.fullname" . }}-config
  - secretRef:
      name: {{ include "taskflow.fullname" . }}-secrets
```

## Init Containers (Wait for Dependencies)

```yaml
initContainers:
  - name: wait-for-db
    image: busybox:1.35
    command: ['sh', '-c', 'until nc -z {{ .Release.Name }}-postgresql 5432; do echo waiting for db; sleep 2; done']
```

## Resource Limits by Environment

```yaml
# values.yaml
resources:
  dev:
    limits:
      cpu: 200m
      memory: 256Mi
  prod:
    limits:
      cpu: 1000m
      memory: 1Gi

# template
resources:
  {{- if eq .Values.environment "production" }}
  {{- toYaml .Values.resources.prod | nindent 12 }}
  {{- else }}
  {{- toYaml .Values.resources.dev | nindent 12 }}
  {{- end }}
```

## Service Account Pattern

```yaml
{{- if .Values.serviceAccount.create }}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "taskflow.serviceAccountName" . }}
  annotations:
    {{- toYaml .Values.serviceAccount.annotations | nindent 4 }}
{{- end }}
```

## PersistentVolumeClaim

```yaml
{{- if .Values.persistence.enabled }}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ include "taskflow.fullname" . }}-data
spec:
  accessModes:
    - {{ .Values.persistence.accessMode | default "ReadWriteOnce" }}
  resources:
    requests:
      storage: {{ .Values.persistence.size | default "10Gi" }}
  {{- if .Values.persistence.storageClass }}
  storageClassName: {{ .Values.persistence.storageClass }}
  {{- end }}
{{- end }}
```

## Multi-Container Pod (Sidecar)

```yaml
containers:
  - name: main
    image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
  - name: sidecar
    image: busybox
    command: ['sh', '-c', 'while true; do echo sidecar running; sleep 30; done']
```
