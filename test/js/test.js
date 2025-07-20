// Custom console logging
function log(message, type = 'info') {
    const output = document.getElementById('consoleOutput');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    output.appendChild(logEntry);
    output.scrollTop = output.scrollHeight;
    
    // Also log to real console
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function clearLog() {
    document.getElementById('consoleOutput').innerHTML = 'Console-Ausgabe gelöscht...';
}

function testAlert() {
    log('Alert Test gestartet', 'info');
    alert('🎉 Alert funktioniert!');
    log('Alert Test erfolgreich', 'success');
    updateStatus('Alert Test erfolgreich');
}

function testConsole() {
    log('Console Test gestartet', 'info');
    console.log('Console Test erfolgreich');
    log('Console Test erfolgreich - siehe auch Browser-Konsole', 'success');
    updateStatus('Console Test erfolgreich - siehe auch Browser-Konsole');
}

async function testBackground() {
    try {
        log('Background Test gestartet', 'info');
        updateStatus('Teste Background-Script Kommunikation...');
        
        if (typeof browser !== 'undefined' && browser.runtime) {
            log('browser.runtime verfügbar', 'info');
            
            const result = await browser.runtime.sendMessage({
                action: 'testConnection',
                message: 'Hello from simple test!'
            });
            
            log('Background response received: ' + JSON.stringify(result), 'info');
            
            if (result && result.success) {
                log('Background-Script Kommunikation erfolgreich!', 'success');
                updateStatus('✅ Background-Script Kommunikation erfolgreich!');
                alert('Background-Script funktioniert!\n\nAntwort: ' + result.message);
            } else {
                log('Background-Script Kommunikation fehlgeschlagen', 'error');
                updateStatus('❌ Background-Script Kommunikation fehlgeschlagen');
                alert('Background-Script Kommunikation fehlgeschlagen');
            }
        } else {
            log('browser.runtime nicht verfügbar - nicht in Thunderbird?', 'error');
            updateStatus('❌ browser.runtime nicht verfügbar');
            alert('browser.runtime nicht verfügbar - nicht in Thunderbird?');
        }
    } catch (error) {
        log('Test fehlgeschlagen: ' + error.message, 'error');
        console.error('Test failed:', error);
        updateStatus('❌ Test fehlgeschlagen: ' + error.message);
        alert('Test fehlgeschlagen: ' + error.message);
    }
}

function updateStatus(message) {
    document.getElementById('status').textContent = 'Status: ' + message;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    log('Page loaded successfully', 'success');
    updateStatus('Seite geladen - Tests bereit');
    
    // Add event listeners
    document.getElementById('alertTestBtn').addEventListener('click', testAlert);
    document.getElementById('consoleTestBtn').addEventListener('click', testConsole);
    document.getElementById('backgroundTestBtn').addEventListener('click', testBackground);
    document.getElementById('clearLogBtn').addEventListener('click', clearLog);
    
    // Log browser environment
    log('Browser environment: ' + navigator.userAgent, 'info');
    log('browser object available: ' + (typeof browser !== 'undefined'), 'info');
    if (typeof browser !== 'undefined') {
        log('browser.runtime available: ' + (typeof browser.runtime !== 'undefined'), 'info');
    }
}); 