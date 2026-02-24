// MyMind3 Utility Functions
window.MyMind3 = window.MyMind3 || {};

window.MyMind3.Utils = {
    // DOM Utilities
    DOM: {
        /**
         * Create an element with attributes and content
         */
        create(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);

            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'class') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else {
                    element.setAttribute(key, value);
                }
            });

            if (content) {
                if (typeof content === 'string') {
                    // HTML 태그 포함 여부 확인 후 적절한 방법 사용
                    if (/<[a-z][\s\S]*>/i.test(content)) {
                        element.innerHTML = typeof DOMPurify !== 'undefined'
                            ? DOMPurify.sanitize(content)
                            : content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    } else {
                        element.textContent = content;
                    }
                } else {
                    element.appendChild(content);
                }
            }

            return element;
        },

        /**
         * Find element with error handling
         */
        find(selector, context = document) {
            const element = context.querySelector(selector);
            if (!element) {
                console.warn(`Element not found: ${selector}`);
            }
            return element;
        },

        /**
         * Find all elements
         */
        findAll(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        },

        /**
         * Toggle class on element
         */
        toggleClass(element, className, force) {
            if (element) {
                return element.classList.toggle(className, force);
            }
            return false;
        },

        /**
         * Add event listener with automatic cleanup
         */
        on(element, event, handler, options = {}) {
            if (element && typeof handler === 'function') {
                element.addEventListener(event, handler, options);
                return () => element.removeEventListener(event, handler, options);
            }
            return () => {};
        }
    },

    // String Utilities
    String: {
        /**
         * Generate a unique ID
         */
        generateId(prefix = 'id') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        /**
         * Sanitize string for display
         */
        sanitize(str) {
            if (typeof str !== 'string') return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
        },

        /**
         * Truncate string with ellipsis
         */
        truncate(str, maxLength = 50, suffix = '...') {
            if (!str || str.length <= maxLength) return str;
            return str.substring(0, maxLength - suffix.length) + suffix;
        },

        /**
         * Capitalize first letter
         */
        capitalize(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        /**
         * Convert to kebab-case
         */
        toKebabCase(str) {
            return str
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .toLowerCase();
        }
    },

    // Number Utilities
    Number: {
        /**
         * Clamp number between min and max
         */
        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },

        /**
         * Round to decimal places
         */
        round(value, decimals = 2) {
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        },

        /**
         * Format file size
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    },

    // Date Utilities
    Date: {
        /**
         * Format date for display
         */
        format(date, options = {}) {
            if (!(date instanceof Date)) {
                date = new Date(date);
            }

            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };

            return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
        },

        /**
         * Get relative time string
         */
        relative(date) {
            const now = new Date();
            const diff = now - new Date(date);
            const seconds = Math.floor(diff / 1000);

            if (seconds < 60) return 'just now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;

            return this.format(date, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    },

    // Object Utilities
    Object: {
        /**
         * Deep clone object
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj);
            if (obj instanceof Array) return obj.map(this.deepClone.bind(this));

            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        },

        /**
         * Deep merge objects
         */
        deepMerge(target, ...sources) {
            if (!sources.length) return target;
            const source = sources.shift();

            if (this.isObject(target) && this.isObject(source)) {
                for (const key in source) {
                    if (this.isObject(source[key])) {
                        if (!target[key]) Object.assign(target, { [key]: {} });
                        this.deepMerge(target[key], source[key]);
                    } else {
                        Object.assign(target, { [key]: source[key] });
                    }
                }
            }

            return this.deepMerge(target, ...sources);
        },

        /**
         * Check if value is object
         */
        isObject(item) {
            return item && typeof item === 'object' && !Array.isArray(item);
        }
    },

    // Array Utilities
    Array: {
        /**
         * Remove item from array
         */
        remove(array, item) {
            const index = array.indexOf(item);
            if (index > -1) {
                array.splice(index, 1);
            }
            return array;
        },

        /**
         * Move item in array
         */
        move(array, fromIndex, toIndex) {
            const element = array[fromIndex];
            array.splice(fromIndex, 1);
            array.splice(toIndex, 0, element);
            return array;
        },

        /**
         * Chunk array into smaller arrays
         */
        chunk(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }
    },

    // Async Utilities
    Async: {
        /**
         * Debounce function calls
         */
        debounce(func, delay) {
            let timeoutId;
            return function (...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        },

        /**
         * Throttle function calls
         */
        throttle(func, delay) {
            let lastCall = 0;
            return function (...args) {
                const now = Date.now();
                if (now - lastCall >= delay) {
                    lastCall = now;
                    return func.apply(this, args);
                }
            };
        },

        /**
         * Sleep/delay function
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Retry function with exponential backoff
         */
        async retry(func, maxAttempts = 3, baseDelay = 1000) {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await func();
                } catch (error) {
                    if (attempt === maxAttempts) throw error;

                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    await this.sleep(delay);
                }
            }
        }
    },

    // Validation Utilities
    Validation: {
        /**
         * Validate project name
         */
        validateProjectName(name) {
            const rules = window.MyMind3.Constants.VALIDATION.PROJECT_NAME;
            if (!name || name.length < rules.MIN_LENGTH) {
                return 'Project name is too short';
            }
            if (name.length > rules.MAX_LENGTH) {
                return 'Project name is too long';
            }
            if (!rules.PATTERN.test(name)) {
                return 'Project name contains invalid characters';
            }
            return null;
        },

        /**
         * Validate email address
         */
        validateEmail(email) {
            const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return pattern.test(email);
        },

        /**
         * Validate URL
         */
        validateUrl(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        }
    },

    // Error Utilities
    Error: {
        /**
         * Create standardized error object
         */
        create(message, type = 'error', details = null) {
            return {
                message,
                type,
                details,
                timestamp: new Date().toISOString(),
                id: window.MyMind3.Utils.String.generateId('error')
            };
        },

        /**
         * Log error with context
         */
        log(error, context = {}) {
            const errorObj = typeof error === 'string'
                ? this.create(error)
                : error;

            console.error('MyMind3 Error:', {
                ...errorObj,
                context
            });

            // Dispatch error event
            window.dispatchEvent(new CustomEvent(
                window.MyMind3.Constants.EVENTS.ERROR_OCCURRED,
                { detail: errorObj }
            ));

            return errorObj;
        }
    },

    // HTTP Utilities
    HTTP: {
        /**
         * Authenticated fetch wrapper that automatically includes storage token
         * @param {string} url - Request URL
         * @param {Object} options - Fetch options
         * @returns {Promise<Response>} Fetch response
         */
        async authenticatedFetch(url, options = {}) {
            try {
                // Get token from StorageAuth
                const token = await window.MyMind3.StorageAuth.getToken();

                if (!token) {
                    throw new Error('Storage token not available');
                }

                // Add token to headers
                const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                const headers = {
                    ...options.headers,
                    'X-Storage-Token': token,
                    ...csrfHeaders
                };

                // Perform fetch with token header
                const response = await fetch(url, {
                    ...options,
                    headers
                });

                return response;
            } catch (error) {
                console.error('[HTTP] Authenticated fetch error:', error);
                throw error;
            }
        },

        /**
         * Helper for JSON POST requests with authentication
         * @param {string} url - Request URL
         * @param {Object} data - JSON data to send
         * @returns {Promise<Object>} JSON response
         */
        async postJSON(url, data) {
            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            const response = await this.authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        },

        /**
         * Helper for JSON GET requests with authentication
         * @param {string} url - Request URL
         * @returns {Promise<Object>} JSON response
         */
        async getJSON(url) {
            const response = await this.authenticatedFetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        }
    }
};

// Freeze the utils to prevent modification
Object.freeze(window.MyMind3.Utils);