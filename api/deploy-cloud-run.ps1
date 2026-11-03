$ErrorActionPreference = 'Stop'
$Project = if ($env:GOOGLE_CLOUD_PROJECT) { $env:GOOGLE_CLOUD_PROJECT } else { 'ultimate-rig-513313-j5' }
$Region = if ($env:CLOUD_RUN_REGION) { $env:CLOUD_RUN_REGION } else { 'asia-south1' }
$Repository = if ($env:ARTIFACT_REPOSITORY) { $env:ARTIFACT_REPOSITORY } else { 'twyn' }
$Service = if ($env:CLOUD_RUN_SERVICE) { $env:CLOUD_RUN_SERVICE } else { 'twyn-api' }
$Image = "$Region-docker.pkg.dev/$Project/$Repository/$Service`:latest"
$RuntimeServiceAccount = if ($env:CLOUD_RUN_SERVICE_ACCOUNT) { $env:CLOUD_RUN_SERVICE_ACCOUNT } else { "$Service@$Project.iam.gserviceaccount.com" }

function Require-ProductionValue([string]$Name) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value) -or $value -match '^(REPLACE|YOUR_|<|CHANGE_ME|TODO)|placeholder|example|dummy') {
        throw "$Name must be set to a real production value before deployment. Secret values are supplied separately through Secret Manager."
    }
    return $value
}

# These are configuration values, not credentials. GOOGLE_REDIRECT_URI must be
# updated to the actual run.app URL after the first Cloud Run deployment.
$GoogleClientId = Require-ProductionValue 'GOOGLE_CLIENT_ID'
$GoogleRedirectUri = Require-ProductionValue 'GOOGLE_REDIRECT_URI'
$WebOrigin = Require-ProductionValue 'WEB_ORIGIN'
$CorsOrigins = Require-ProductionValue 'CORS_ORIGINS'
$R2AccountId = Require-ProductionValue 'R2_ACCOUNT_ID'
$R2BucketName = Require-ProductionValue 'R2_BUCKET_NAME'
$R2Endpoint = Require-ProductionValue 'R2_ENDPOINT'
$R2Region = if ($env:R2_REGION) { $env:R2_REGION } else { 'auto' }

$NormalizedWebOrigin = $WebOrigin.TrimEnd('/')
$NormalizedCorsOrigins = @($CorsOrigins.Split(',') | ForEach-Object { $_.Trim().TrimEnd('/') } | Where-Object { $_ })
if ($NormalizedWebOrigin -ne 'https://twynai.vercel.app') {
    throw 'WEB_ORIGIN must be https://twynai.vercel.app.'
}
foreach ($RequiredOrigin in @('https://twynai.vercel.app', 'http://localhost:3100')) {
    if ($NormalizedCorsOrigins -notcontains $RequiredOrigin) {
        throw "CORS_ORIGINS must include $RequiredOrigin."
    }
}
if ($NormalizedCorsOrigins -contains '*') {
    throw 'CORS_ORIGINS must not contain * when credentials are enabled.'
}

try {
    $RedirectUri = [Uri]$GoogleRedirectUri
    if ($RedirectUri.Scheme -ne 'https' -or $RedirectUri.AbsolutePath -ne '/api/auth/google/callback') {
        throw 'GOOGLE_REDIRECT_URI must be an HTTPS URL ending in /api/auth/google/callback.'
    }
} catch {
    throw "Invalid GOOGLE_REDIRECT_URI: $($_.Exception.Message)"
}

# Use a custom delimiter because CORS_ORIGINS is itself comma-separated.
$RuntimeEnvVars = "^|^PORT=8080|ALLOW_DEV_LOGIN=0|DB_POOL_SIZE=2|DB_MAX_OVERFLOW=0|UPLOAD_DIR=/tmp/twyn-uploads|GOOGLE_CLIENT_ID=$GoogleClientId|GOOGLE_REDIRECT_URI=$GoogleRedirectUri|WEB_ORIGIN=$WebOrigin|CORS_ORIGINS=$CorsOrigins|GNANI_BASE_URL=https://api.vachana.ai|GNANI_TTS_MODEL=timbre-v3.0|GNANI_DEFAULT_VOICE=Shivani|NVIDIA_MODEL=openai/gpt-oss-20b|META_MODEL=muse-spark-1.3|META_MONTHLY_BUDGET_USD=30|GROQ_MODEL=openai/gpt-oss-120b|OPENROUTER_MODEL=openai/gpt-4o-mini|R2_ACCOUNT_ID=$R2AccountId|R2_BUCKET_NAME=$R2BucketName|R2_ENDPOINT=$R2Endpoint|R2_REGION=$R2Region|EMBED_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2|RAG_MIN_SCORE=0.27|VECTOR_STORE=sql|RATE_LIMIT_PER_MIN=30|MAX_AUDIO_BYTES=8388608|MAX_IMAGE_BYTES=3145728|MAX_DOC_BYTES=10485760|MAX_TEXT_CHARS=1500|SESSION_DAYS=30"
$SecretRefs = 'DATABASE_URL=twyn-database-url:latest,GOOGLE_CLIENT_SECRET=twyn-google-client-secret:latest,GNANI_API_KEY=twyn-gnani-api-key:latest,META_API_KEY=twyn-meta-api-key:latest,NVIDIA_API_KEY=twyn-nvidia-api-key:latest,GROQ_API_KEY=twyn-groq-api-key:latest,OPENROUTER_API_KEY=twyn-openrouter-api-key:latest,R2_ACCESS_KEY_ID=twyn-r2-access-key-id:latest,R2_SECRET_ACCESS_KEY=twyn-r2-secret-access-key:latest'

# Explicit operator action; this does not enable APIs, create secrets, or deploy implicitly.
gcloud builds submit . --project $Project --region $Region --tag $Image
gcloud run deploy $Service --project $Project --region $Region --image $Image --platform managed --service-account $RuntimeServiceAccount --port 8080 --cpu 1 --memory 2Gi --min 0 --max 1 --no-cpu-boost --timeout 900 --concurrency 20 --set-env-vars $RuntimeEnvVars --set-secrets $SecretRefs
gcloud run services describe $Service --project $Project --region $Region --format='value(status.url)'
