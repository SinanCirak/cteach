# Terraform Kurulum Scripti
# PowerShell'i Administrator olarak çalıştırın

Write-Host "Terraform Kurulum Başlatılıyor..." -ForegroundColor Green

# Chocolatey kontrolü
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue

if (-not $chocoInstalled) {
    Write-Host "Chocolatey bulunamadı. Kurulum yapılıyor..." -ForegroundColor Yellow
    
    # Chocolatey kurulumu
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    Write-Host "Chocolatey kuruldu. PowerShell'i yeniden başlatın ve scripti tekrar çalıştırın." -ForegroundColor Yellow
    exit
}

# Terraform kurulumu
Write-Host "Terraform kuruluyor..." -ForegroundColor Green
choco install terraform -y

# PATH kontrolü
Write-Host "`nKurulum tamamlandı. Doğrulama yapılıyor..." -ForegroundColor Green
Start-Sleep -Seconds 2

# Yeni PATH ile terraform kontrolü
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$terraformInstalled = Get-Command terraform -ErrorAction SilentlyContinue

if ($terraformInstalled) {
    Write-Host "`n✅ Terraform başarıyla kuruldu!" -ForegroundColor Green
    terraform --version
    Write-Host "`nPowerShell'i yeniden başlatın ve 'terraform init' komutunu çalıştırın." -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️ Terraform kuruldu ancak PATH'e eklenmedi." -ForegroundColor Yellow
    Write-Host "PowerShell'i yeniden başlatın ve tekrar deneyin." -ForegroundColor Yellow
}


