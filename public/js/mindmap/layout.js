// MyMind3 Layout Management
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.MindMap = window.MyMind3.MindMap || {};

window.MyMind3.MindMap.Layout = {
    arrangeNodes(nodes, type = 'radial') {
        if (type === 'radial') {
            this._arrangeRadial(nodes);
        }
    },

    _arrangeRadial(nodes) {
        if (!nodes || nodes.length === 0) return;
        
        const centerX = 400;
        const centerY = 300;
        const radius = 150;
        
        nodes.forEach((node, index) => {
            const angle = (index / nodes.length) * 2 * Math.PI;
            node.x = centerX + Math.cos(angle) * radius;
            node.y = centerY + Math.sin(angle) * radius;
        });
    }
};

Object.freeze(window.MyMind3.MindMap.Layout);