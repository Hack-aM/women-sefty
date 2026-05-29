# Script to copy files from 'd:\women sefty' to 'd:\New folder'
$Source = "d:\women sefty"
$Destination = "d:\New folder"

if (Test-Path $Source) {
    Write-Host "Copying files from $Source to $Destination..."
    Copy-Item -Path "$Source\*" -Destination $Destination -Recurse -Force -Exclude "node_modules", ".git"
    Write-Host "Copy completed successfully!"
} else {
    Write-Error "Source directory $Source does not exist."
}
