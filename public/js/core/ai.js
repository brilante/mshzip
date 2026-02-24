// MyMind3 AI Integration
window.MyMind3 = window.MyMind3 || {};

window.MyMind3.AI = {
    // AI service state
    _isInitialized: false,
    _isEnabled: false,
    _currentModel: 'gpt-4o-mini',
    _apiEndpoint: (window.MyMind3 && window.MyMind3.Constants && window.MyMind3.Constants.API && window.MyMind3.Constants.API.AI) || '/api/ai',

    /**
     * Initialize AI service
     */
    async init() {
        try {
            const status = await this.getStatus();
            this._isEnabled = status.enabled;
            this._currentModel = status.defaultModel;
            this._isInitialized = true;

            console.log('AI service initialized:', {
                enabled: this._isEnabled,
                model: this._currentModel,
                availableModels: status.availableModels
            });

            if (window.MyMind3 && window.MyMind3.Events && window.MyMind3.Events.emit) {
                window.MyMind3.Events.emit('ai:initialized', status);
            }
            return true;
        } catch (error) {
            console.error('Failed to initialize AI service:', error);
            if (window.MyMind3 && window.MyMind3.Utils && window.MyMind3.Utils.Error) {
                window.MyMind3.Utils.Error.log(error, { service: 'ai', operation: 'init' });
            }
            return false;
        }
    },

    /**
     * Get AI service status
     */
    async getStatus() {
        try {
            const response = await fetch(`${this._apiEndpoint}/status`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to get AI status:', error);
            throw error;
        }
    },

    /**
     * Check if AI is available
     */
    isAvailable() {
        return this._isInitialized && this._isEnabled;
    },

    /**
     * Send chat message to AI
     */
    async chat(message, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('AI service is not available');
        }

        const {
            model = this._currentModel,
            temperature = 0.7,
            maxTokens = 1000,
            context = null
        } = options;

        try {
            const payload = {
                message,
                model,
                temperature,
                maxTokens
            };

            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch(`${this._apiEndpoint}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const result = await response.json();

            // Store in AI history
            window.MyMind3.AISettingsStorage.addToHistory(message, result.data.response);

            // Emit AI response event
            window.MyMind3.EventEmitter.emitAiResponse({
                query: message,
                response: result.data.response,
                usage: result.data.usage,
                model: result.data.model
            });

            return result.data;
        } catch (error) {
            console.error('AI chat failed:', error);
            window.MyMind3.Utils.Error.log(error, { service: 'ai', operation: 'chat', message });
            throw error;
        }
    },

    /**
     * Generate image using AI
     */
    async generateImage(prompt, options = {}) {
        if (!this.isAvailable()) {
            throw new Error('AI service is not available');
        }

        const {
            size = '1024x1024',
            n = 1
        } = options;

        try {
            const payload = {
                prompt,
                size,
                n
            };

            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch(`${this._apiEndpoint}/image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('AI image generation failed:', error);
            window.MyMind3.Utils.Error.log(error, { service: 'ai', operation: 'image', prompt });
            throw error;
        }
    }
};

// AI Assistant for Mind Maps
window.MyMind3.AIAssistant = {
    /**
     * Generate suggestions for mind map expansion
     */
    async suggestNodes(node, context = {}) {
        const prompt = this._buildNodeSuggestionPrompt(node, context);

        try {
            const response = await window.MyMind3.AI.chat(prompt, {
                temperature: 0.8,
                maxTokens: 500
            });

            return this._parseNodeSuggestions(response.response);
        } catch (error) {
            console.error('Failed to generate node suggestions:', error);
            return [];
        }
    },

    /**
     * Analyze mind map structure and provide insights
     */
    async analyzeMindMap(mindMapData) {
        const prompt = this._buildAnalysisPrompt(mindMapData);

        try {
            const response = await window.MyMind3.AI.chat(prompt, {
                temperature: 0.3,
                maxTokens: 800
            });

            return {
                analysis: response.response,
                suggestions: this._parseAnalysisSuggestions(response.response)
            };
        } catch (error) {
            console.error('Failed to analyze mind map:', error);
            return null;
        }
    },

    /**
     * Generate mind map from text description
     */
    async generateFromText(description, options = {}) {
        const {
            maxNodes = 20,
            maxDepth = 4
        } = options;

        const prompt = `Create a mind map structure from this description: "${description}".
                       Return a JSON structure with nodes and connections.
                       Limit to ${maxNodes} nodes and ${maxDepth} levels deep.
                       Format: {"name": "root", "children": [{"name": "child1", "children": [...]}, ...]}`;

        try {
            const response = await window.MyMind3.AI.chat(prompt, {
                temperature: 0.5,
                maxTokens: 1000
            });

            return this._parseMindMapStructure(response.response);
        } catch (error) {
            console.error('Failed to generate mind map from text:', error);
            return null;
        }
    },

    /**
     * Improve node content using AI
     */
    async improveNodeContent(nodeText, context = {}) {
        const prompt = `Improve this mind map node text: "${nodeText}".
                       Make it more clear, concise, and informative.
                       Return only the improved text, no explanation.`;

        try {
            const response = await window.MyMind3.AI.chat(prompt, {
                temperature: 0.3,
                maxTokens: 200
            });

            return response.response.trim();
        } catch (error) {
            console.error('Failed to improve node content:', error);
            return nodeText; // Return original text on failure
        }
    },

    // Private helper methods
    _buildNodeSuggestionPrompt(node, context) {
        let prompt = `Given a mind map node with text: "${node.text}"`;

        if (node.description) {
            prompt += ` and description: "${node.description}"`;
        }

        if (context.parentNode) {
            prompt += `. The parent node is: "${context.parentNode.text}"`;
        }

        if (context.siblingNodes && context.siblingNodes.length > 0) {
            const siblings = context.siblingNodes.map(n => n.text).join(', ');
            prompt += `. Sibling nodes are: ${siblings}`;
        }

        prompt += `. Suggest 3-5 related child nodes that would expand on this concept.
                   Return as a simple list, one suggestion per line.`;

        return prompt;
    },

    _buildAnalysisPrompt(mindMapData) {
        const nodeCount = this._countNodes(mindMapData);
        const depth = this._calculateDepth(mindMapData);

        return `Analyze this mind map structure:
                - Root topic: "${mindMapData.name || mindMapData.text}"
                - Total nodes: ${nodeCount}
                - Maximum depth: ${depth}

                Provide insights about:
                1. Overall structure and organization
                2. Areas that might need more detail
                3. Potential gaps or missing connections
                4. Suggestions for improvement

                Keep the response concise and actionable.`;
    },

    _parseNodeSuggestions(response) {
        return response
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.match(/^\d+\./))
            .slice(0, 5)
            .map(suggestion => ({
                text: suggestion.replace(/^[-*•]\s*/, ''),
                id: window.MyMind3.Utils.String.generateId('suggested_node')
            }));
    },

    _parseAnalysisSuggestions(response) {
        // Extract actionable suggestions from the analysis
        const suggestions = [];
        const lines = response.split('\n');

        lines.forEach(line => {
            if (line.includes('suggest') || line.includes('consider') || line.includes('add')) {
                suggestions.push(line.trim());
            }
        });

        return suggestions.slice(0, 5);
    },

    _parseMindMapStructure(response) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback: create a simple structure from the text
            return this._createFallbackStructure(response);
        } catch (error) {
            console.error('Failed to parse mind map structure:', error);
            return this._createFallbackStructure(response);
        }
    },

    _createFallbackStructure(text) {
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        return {
            name: 'AI Generated Mind Map',
            children: lines.slice(0, 5).map(line => ({
                name: line.replace(/^[-*•]\s*/, ''),
                children: []
            }))
        };
    },

    _countNodes(node) {
        let count = 1;
        if (node.children && node.children.length > 0) {
            count += node.children.reduce((sum, child) => sum + this._countNodes(child), 0);
        }
        return count;
    },

    _calculateDepth(node, currentDepth = 1) {
        if (!node.children || node.children.length === 0) {
            return currentDepth;
        }

        return Math.max(...node.children.map(child =>
            this._calculateDepth(child, currentDepth + 1)
        ));
    }
};

// AI Chat Interface
window.MyMind3.AIChat = {
    _chatHistory: [],
    _isProcessing: false,

    /**
     * Send message and get response
     */
    async sendMessage(message) {
        if (this._isProcessing) {
            throw new Error('AI is currently processing another request');
        }

        this._isProcessing = true;

        try {
            // Add user message to history
            this._addToHistory('user', message);

            // Get AI response
            const response = await window.MyMind3.AI.chat(message);

            // Add AI response to history
            this._addToHistory('assistant', response.response);

            return {
                message: response.response,
                usage: response.usage
            };
        } catch (error) {
            this._addToHistory('error', error.message);
            throw error;
        } finally {
            this._isProcessing = false;
        }
    },

    /**
     * Get chat history
     */
    getHistory() {
        return [...this._chatHistory];
    },

    /**
     * Clear chat history
     */
    clearHistory() {
        this._chatHistory = [];
        window.MyMind3.Events.emit('ai:history-cleared');
    },

    /**
     * Check if AI is processing
     */
    isProcessing() {
        return this._isProcessing;
    },

    // Private methods
    _addToHistory(role, content) {
        const entry = {
            id: window.MyMind3.Utils.String.generateId('chat'),
            role,
            content,
            timestamp: new Date().toISOString()
        };

        this._chatHistory.push(entry);

        // Limit history size
        if (this._chatHistory.length > 100) {
            this._chatHistory = this._chatHistory.slice(-50);
        }

        window.MyMind3.Events.emit('ai:message-added', entry);
    }
};

// Initialize AI when the app starts
if (window.MyMind3?.Events?.on) {
    window.MyMind3.Events.on('app:initialized', async () => {
        await window.MyMind3.AI.init();
    });
} else {
    // Events 모듈이 아직 로드되지 않은 경우 대기
    console.warn('[AI] Events module not ready, waiting...');
    const checkEvents = setInterval(() => {
        if (window.MyMind3?.Events?.on) {
            clearInterval(checkEvents);
            window.MyMind3.Events.on('app:initialized', async () => {
                await window.MyMind3.AI.init();
            });
            console.log('[AI] Events module ready, listener registered');
        }
    }, 100);
    // 5초 후 타임아웃
    setTimeout(() => clearInterval(checkEvents), 5000);
}

// Freeze AI objects
Object.freeze(window.MyMind3.AI);
Object.freeze(window.MyMind3.AIAssistant);
Object.freeze(window.MyMind3.AIChat);