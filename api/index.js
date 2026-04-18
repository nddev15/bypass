const axios = require('axios');

// API Configuration
const IZEN_API_URL = process.env.API_KEY || 'https://api.izen.lol/v1/bypass';
const IZEN_API_KEY = process.env.API_KEY || '';

// URL validation
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Get domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return '';
  }
}

// Enhanced axios instance
const httpClient = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

/**
 * Bypass URL using api.izen.lol
 */
async function bypassWithIzenAPI(url) {
  try {
    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `${IZEN_API_URL}?url=${encodedUrl}`;
    
    console.log(`[Bypass] Requesting: ${apiUrl}`);
    
    const response = await httpClient.get(apiUrl, {
      headers: {
        'x-api-key': IZEN_API_KEY,
        'Authorization': `Bearer ${IZEN_API_KEY}`
      }
    });
    
    // Check response structure
    if (response.data && response.data.ok && response.data.data && response.data.data.url) {
      const bypassedUrl = response.data.data.url;
      console.log(`[Bypass] Success: ${url} -> ${bypassedUrl}`);
      return bypassedUrl;
    }
    
    // Alternative response structure
    if (response.data && response.data.url) {
      const bypassedUrl = response.data.url;
      console.log(`[Bypass] Success: ${url} -> ${bypassedUrl}`);
      return bypassedUrl;
    }
    
    throw new Error('Invalid API response structure');
  } catch (error) {
    console.error(`[Bypass Error] ${error.message}`);
    throw new Error('Bypass failed: ' + (error.response?.data?.message || error.message));
  }
}

/**
 * Main API handler for Vercel
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const path = req.url || '/';
    
    // Health check
    if (path === '/health' || path === '/') {
      return res.status(200).json({
        status: 'ok',
        message: 'Bypass API is running on Vercel',
        timestamp: new Date().toISOString(),
        apiProvider: 'izen.lol'
      });
    }
    
    // Shorteners info
    if (path === '/shorteners') {
      return res.status(200).json({
        ok: true,
        data: {
          provider: 'izen.lol',
          supported: [
            'delta',
            'linkvertise',
            'lootlabs',
            'và tất cả các shortener dựa trên redirect'
          ],
          endpoints: {
            bypass_get: 'GET /bypass?url=YOUR_URL',
            bypass_post: 'POST /bypass',
            bypass_batch: 'POST /bypass-batch'
          }
        }
      });
    }
    
    // Main bypass endpoint
    if (path.startsWith('/bypass')) {
      // Get URL from query or body
      let url = req.query?.url || req.body?.url;
      
      if (!url) {
        return res.status(400).json({
          ok: false,
          message: 'URL is required'
        });
      }
      
      if (!isValidUrl(url)) {
        return res.status(400).json({
          ok: false,
          message: 'Invalid URL format'
        });
      }
      
      const domain = getDomain(url);
      const bypassedUrl = await bypassWithIzenAPI(url);
      
      if (!bypassedUrl) {
        return res.status(400).json({
          ok: false,
          message: 'Could not bypass this URL'
        });
      }
      
      return res.status(200).json({
        ok: true,
        data: {
          url: bypassedUrl,
          original: url,
          domain: domain
        }
      });
    }
    
    // Batch bypass endpoint
    if (path === '/bypass-batch') {
      const { urls } = req.body || {};
      
      if (!Array.isArray(urls)) {
        return res.status(400).json({
          ok: false,
          message: 'URLs must be an array'
        });
      }
      
      if (urls.length === 0) {
        return res.status(400).json({
          ok: false,
          message: 'URLs array is empty'
        });
      }
      
      if (urls.length > 20) {
        return res.status(400).json({
          ok: false,
          message: 'Maximum 20 URLs per request'
        });
      }
      
      const results = await Promise.allSettled(
        urls.map(async (url) => {
          if (!isValidUrl(url)) {
            throw new Error('Invalid URL format');
          }
          
          const domain = getDomain(url);
          const bypassedUrl = await bypassWithIzenAPI(url);
          
          if (!bypassedUrl) {
            throw new Error('Could not bypass this URL');
          }
          
          return {
            original: url,
            url: bypassedUrl,
            domain: domain,
            ok: true
          };
        })
      );
      
      return res.status(200).json({
        ok: true,
        data: results.map((r, i) => 
          r.status === 'fulfilled' 
            ? r.value 
            : { 
                original: urls[i], 
                ok: false, 
                error: r.reason.message 
              }
        )
      });
    }
    
    // 404
    return res.status(404).json({
      ok: false,
      message: 'Endpoint not found',
      available: ['/health', '/shorteners', '/bypass', '/bypass-batch']
    });
    
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      ok: false,
      message: error.message
    });
  }
};
