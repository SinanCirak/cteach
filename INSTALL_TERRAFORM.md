# 📦 Terraform Kurulum Rehberi

## Sorun
Terraform sisteminizde kurulu değil. Aşağıdaki yöntemlerden birini kullanarak kurabilirsiniz.

## Yöntem 1: Chocolatey ile (Önerilen - En Kolay)

### 1. Chocolatey Kurulumu
PowerShell'i **Administrator** olarak açın ve şu komutu çalıştırın:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. Terraform Kurulumu
```powershell
choco install terraform -y
```

### 3. Doğrulama
```powershell
terraform --version
```

---

## Yöntem 2: Manuel Kurulum (Chocolatey olmadan)

### 1. Terraform İndir
1. https://developer.hashicorp.com/terraform/downloads adresine git
2. Windows için `.zip` dosyasını indir
3. Örnek: `terraform_1.6.0_windows_amd64.zip`

### 2. Kurulum
```powershell
# İndirilen zip dosyasını aç
# Örnek: C:\terraform klasörüne çıkart

# PATH'e ekle (PowerShell Administrator olarak)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\terraform", [EnvironmentVariableTarget]::Machine)

# PowerShell'i yeniden başlat
```

### 3. Doğrulama
Yeni PowerShell penceresi aç ve:
```powershell
terraform --version
```

---

## Yöntem 3: Winget ile (Windows 10/11)

```powershell
winget install HashiCorp.Terraform
```

---

## Hızlı Test

Kurulumdan sonra:
```powershell
cd E:\WORK\Tilgo\terraform
terraform init
```

Eğer hala çalışmıyorsa:
1. PowerShell'i **kapatıp yeniden aç**
2. PATH değişkeninin güncellendiğinden emin ol
3. `terraform --version` ile test et

---

## Alternatif: Terraform Cloud (Web UI)

Eğer komut satırı kurulumu zorsa, Terraform Cloud kullanabilirsiniz:
- https://app.terraform.io
- Ücretsiz hesap oluştur
- Web UI'dan çalıştır

---

## Sorun Giderme

### "terraform is not recognized"
- PowerShell'i **yeniden başlat**
- PATH değişkenini kontrol et: `$env:PATH`
- Terraform'un kurulu olduğu klasörü PATH'e ekle

### Chocolatey kurulumu başarısız
- PowerShell'i **Administrator** olarak çalıştır
- ExecutionPolicy'yi kontrol et: `Get-ExecutionPolicy`
- Manuel kurulum (Yöntem 2) kullan


