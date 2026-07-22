from fastapi import Request
def get_client_metadata(request: Request):
    user_agent_str = request.headers.get("user-agent", "Unknown")
    referrer = request.headers.get("referer", "Direct")
    
    # Minimal user agent parsing simulation
    browser, os, device = "Other", "Other", "Desktop"
    ua = user_agent_str.lower()
    
    if "chrome" in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua:
        browser = "Safari"
    elif "edge" in ua:
        browser = "Edge"
        
    if "windows" in ua:
        os = "Windows"
    elif "mac" in ua:
        os = "macOS"
    elif "linux" in ua:
        os = "Linux"
    elif "android" in ua:
        os = "Android"
        device = "Mobile"
    elif "iphone" in ua or "ipad" in ua:
        os = "iOS"
        device = "Mobile"
        
    # Standard header checking for cloud geo location
    country = request.headers.get("cf-ipcountry", "United States") # Fallback
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "127.0.0.1")
    client_ip = client_ip.split(",")[0].strip()

    return {
        "browser": browser,
        "os": os,
        "country": country,
        "ip_address": client_ip,
        "referrer": referrer,
        "device_type": device
    }