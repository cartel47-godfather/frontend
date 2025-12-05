/**
 * CARTEL47 Frontend API Client
 * Handles all backend communication for betting platform
 * STEP 9: Frontend-Backend Integration
 */

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api';

class CartelAPI {
  constructor() {
    this.token = localStorage.getItem('cartel47_token');
    this.userId = localStorage.getItem('cartel47_userId');
    this.walletAddress = localStorage.getItem('cartel47_wallet');
  }

  // Set authorization token
  setToken(token, userId, walletAddress) {
    this.token = token;
    this.userId = userId;
    this.walletAddress = walletAddress;
    localStorage.setItem('cartel47_token', token);
    localStorage.setItem('cartel47_userId', userId);
    localStorage.setItem('cartel47_wallet', walletAddress);
  }

  // Clear session
  clearSession() {
    this.token = null;
    this.userId = null;
    this.walletAddress = null;
    localStorage.removeItem('cartel47_token');
    localStorage.removeItem('cartel47_userId');
    localStorage.removeItem('cartel47_wallet');
  }

  // Generic fetch wrapper with auth
  async fetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Authenticate with wallet
   * @param {string} walletAddress - User's wallet address
   * @param {string} signature - Signed message from wallet
   */
  async authenticateWallet(walletAddress, signature) {
    const data = await this.fetch('/auth/connect', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, signature }),
    });
    this.setToken(data.token, data.userId, walletAddress);
    return data;
  }

  // ==================== GAMES ====================

  /**
   * Get all games
   */
  async getAllGames() {
    return this.fetch('/games');
  }

  /**
   * Get games by category
   * @param {string} category - Game category (slots, table, original, live)
   */
  async getGamesByCategory(category) {
    return this.fetch(`/games?category=${category}`);
  }

  /**
   * Get single game details
   * @param {string} gameId - Game ID
   */
  async getGame(gameId) {
    return this.fetch(`/games/${gameId}`);
  }

  // ==================== BETTING ====================

  /**
   * Place a new bet
   * @param {string} gameId - Game to bet on
   * @param {number} betAmount - Bet amount
   * @param {string} clientSeed - Client-provided seed for provably-fair
   */
  async placeBet(gameId, betAmount, clientSeed) {
    if (!this.token) throw new Error('Not authenticated');
    
    const data = await this.fetch('/bets/place', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        betAmount,
        clientSeed,
      }),
    });
    return data;
  }

  /**
   * Get bet details with proof data
   * @param {string} betId - Bet ID
   */
  async getBet(betId) {
    if (!this.token) throw new Error('Not authenticated');
    return this.fetch(`/bets/${betId}`);
  }

  /**
   * Settle a pending bet
   * @param {string} betId - Bet ID to settle
   */
  async settleBet(betId) {
    if (!this.token) throw new Error('Not authenticated');
    
    const data = await this.fetch(`/bets/${betId}/settle`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return data;
  }

  /**
   * Get user's bet history
   * @param {object} options - Query options (status, limit, offset)
   */
  async getUserBets(options = {}) {
    if (!this.userId) throw new Error('Not authenticated');
    
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    return this.fetch(`/bets/user/${this.userId}?${params.toString()}`);
  }

  // ==================== TRANSACTIONS ====================

  /**
   * Create deposit transaction
   * @param {number} amount - Amount to deposit
   * @param {string} tokenSymbol - Token symbol (USDC, MATIC, etc)
   */
  async deposit(amount, tokenSymbol) {
    if (!this.token) throw new Error('Not authenticated');
    
    return this.fetch('/transactions/deposit', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        tokenSymbol,
      }),
    });
  }

  /**
   * Create withdrawal transaction
   * @param {number} amount - Amount to withdraw
   * @param {string} tokenSymbol - Token symbol
   */
  async withdraw(amount, tokenSymbol) {
    if (!this.token) throw new Error('Not authenticated');
    
    return this.fetch('/transactions/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        tokenSymbol,
      }),
    });
  }

  /**
   * Get transaction history
   */
  async getTransactions(type = null) {
    if (!this.token) throw new Error('Not authenticated');
    
    const url = type ? `/transactions?type=${type}` : '/transactions';
    return this.fetch(url);
  }

  // ==================== ADMIN/HEALTH ====================

  /**
   * Check backend health
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.ok ? { status: 'healthy' } : { status: 'unhealthy' };
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  /**
   * Check database connection
   */
  async checkDatabase() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/db-check`);
      return response.ok ? { status: 'connected' } : { status: 'disconnected' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

// Export singleton instance
const api = new CartelAPI();

// Export for both ES6 and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}

if (typeof window !== 'undefined') {
  window.CartelAPI = api;
}
