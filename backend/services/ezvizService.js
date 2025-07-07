const axios = require('axios');
const cron = require('node-cron');
const qs = require('qs');

class EzvizService {
  constructor() {
    this.accessToken = null;
    this.expireTime = null;
    this.areaDomain = null;
    this.isInitializing = false;
  }

  // Initialize the EZVIZ token
  async initializeEzvizToken() {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    console.log('🔄 Initializing EZVIZ token...');
    
    try {
      await this.getAccessToken();
      this.scheduleTokenRenewal();
      console.log('✅ EZVIZ token initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize EZVIZ token:', error.message);
      // Retry after 5 minutes
      setTimeout(() => this.initializeEzvizToken(), 5 * 60 * 1000);
    } finally {
      this.isInitializing = false;
    }
  }

  // Get access token from EZVIZ API
  async getAccessToken() {
    const appKey = process.env.EZVIZ_APP_KEY;
    const appSecret = process.env.EZVIZ_APP_SECRET;

    console.log('EZVIZ_APP_KEY:', appKey);
    console.log('EZVIZ_APP_SECRET:', appSecret);

    if (!appKey || !appSecret) {
      throw new Error('EZVIZ_APP_KEY and EZVIZ_APP_SECRET must be configured');
    }

    try {
      const data = qs.stringify({ appKey, appSecret });
      const response = await axios.post('https://open.ezvizlife.com/api/lapp/token/get', 
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.code === '200') {
        this.accessToken = response.data.data.accessToken;
        this.expireTime = response.data.data.expireTime;
        this.areaDomain = response.data.data.areaDomain;
        
        console.log(`✅ EZVIZ token obtained successfully. Expires: ${new Date(this.expireTime).toISOString()}`);
        return response.data.data;
      } else {
        throw new Error(`EZVIZ API error: ${response.data.msg} (${response.data.code})`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.msg || error.response.statusText}`);
      }
      throw error;
    }
  }

  // Schedule token renewal (every 6 days)
  scheduleTokenRenewal() {
    // Run every day at 2 AM to check if renewal is needed
    cron.schedule('0 2 * * *', async () => {
      await this.checkAndRenewToken();
    });
    
    console.log('⏰ Token renewal scheduled (daily at 2 AM)');
  }

  // Check if token needs renewal and renew if necessary
  async checkAndRenewToken() {
    if (!this.expireTime) {
      console.log('⚠️ No token expiration time found, reinitializing...');
      await this.initializeEzvizToken();
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = this.expireTime - now;
    const oneDayInMs = 24 * 60 * 60 * 1000;

    // Renew if token expires in less than 1 day
    if (timeUntilExpiry < oneDayInMs) {
      console.log('🔄 Token expires soon, renewing...');
      await this.getAccessToken();
    } else {
      console.log(`✅ Token is still valid for ${Math.floor(timeUntilExpiry / oneDayInMs)} days`);
    }
  }

  // Get current access token
  getAccessTokenSync() {
    if (!this.accessToken) {
      throw new Error('EZVIZ access token not available');
    }
    return this.accessToken;
  }

  // Get area domain
  getAreaDomain() {
    if (!this.areaDomain) {
      throw new Error('EZVIZ area domain not available');
    }
    return this.areaDomain;
  }

  // Get live stream URL
  async getLiveStreamUrl(deviceSerial, channelNo = 1, protocol = 2) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/lapp/live/address/get`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&protocol=${protocol}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.code === '200') {
        return {
          url: response.data.data.url,
          id: response.data.data.id,
          expireTime: response.data.data.expireTime
        };
      } else {
        throw new Error(`EZVIZ API error: ${response.data.msg} (${response.data.code})`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.msg || error.response.statusText}`);
      }
      throw error;
    }
  }

  // Get playback stream URL
  async getPlaybackStreamUrl(deviceSerial, startTime, endTime, channelNo = 1, protocol = 2) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/lapp/live/address/get`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&protocol=${protocol}&type=2&startTime=${startTime}&endTime=${endTime}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.code === '200') {
        return {
          url: response.data.data.url,
          id: response.data.data.id,
          expireTime: response.data.data.expireTime
        };
      } else {
        throw new Error(`EZVIZ API error: ${response.data.msg} (${response.data.code})`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.msg || error.response.statusText}`);
      }
      throw error;
    }
  }

  // Query local video records
  async queryLocalVideoRecords(deviceSerial, startTime, endTime, channelNo = 1) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/v3/das/device/local/video/query`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&startTime=${startTime}&endTime=${endTime}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.meta?.code === 200) {
        return response.data.data;
      } else {
        throw new Error(`EZVIZ API error: ${response.data.meta?.message || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.meta?.message || error.response.statusText}`);
      }
      throw error;
    }
  }

  // Disable stream URL
  async disableStreamUrl(deviceSerial, urlId, channelNo = 1) {
    const accessToken = this.getAccessTokenSync();
    const areaDomain = this.getAreaDomain();

    try {
      const response = await axios.post(`${areaDomain}/api/lapp/live/address/disable`,
        `accessToken=${accessToken}&deviceSerial=${deviceSerial}&channelNo=${channelNo}&urlId=${urlId}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.data.code === '200') {
        return true;
      } else {
        throw new Error(`EZVIZ API error: ${response.data.msg} (${response.data.code})`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`EZVIZ API error: ${error.response.data?.msg || error.response.statusText}`);
      }
      throw error;
    }
  }
}

// Create singleton instance
const ezvizService = new EzvizService();

// Export functions for external use
const initializeEzvizToken = () => ezvizService.initializeEzvizToken();
const getAccessTokenSync = () => ezvizService.getAccessTokenSync();
const getLiveStreamUrl = (deviceSerial, channelNo, protocol) => ezvizService.getLiveStreamUrl(deviceSerial, channelNo, protocol);
const getPlaybackStreamUrl = (deviceSerial, startTime, endTime, channelNo, protocol) => ezvizService.getPlaybackStreamUrl(deviceSerial, startTime, endTime, channelNo, protocol);
const queryLocalVideoRecords = (deviceSerial, startTime, endTime, channelNo) => ezvizService.queryLocalVideoRecords(deviceSerial, startTime, endTime, channelNo);
const disableStreamUrl = (deviceSerial, urlId, channelNo) => ezvizService.disableStreamUrl(deviceSerial, urlId, channelNo);

module.exports = {
  initializeEzvizToken,
  getAccessTokenSync,
  getLiveStreamUrl,
  getPlaybackStreamUrl,
  queryLocalVideoRecords,
  disableStreamUrl,
  ezvizService
}; 