/**
 * MyMind3 Mindmap Configuration Constants
 * All configurable values for mindmap display and behavior
 * 2025-12-18: 전체 크기 15% 축소 적용 (85% 스케일)
 */

// Namespace for configuration
window.MindmapConfig = {
    // Text display configuration
    text: {
        // Maximum character length for node title display by depth level
        maxDisplayLength: {
            root: 30,      // Root node (level 0) - more space for main topic
            level1: 12,    // First level children - important subtopics
            level2: 14,    // Second level children - details
            deepLevel: 16  // All deeper levels (level 3+) - nested details
        },
        // Fallback for legacy code
        defaultMaxLength: 16,
        // Ellipsis string for truncated text
        ellipsis: '...'
    },

    // Font size configuration (in pixels) - 15% 축소
    fontSize: {
        // Root node (level 0)
        root: 17,           // was 20
        // First level children (level 1)
        level1: 14,         // was 17
        // Second level children (level 2)
        level2: 13,         // was 15
        // All deeper levels (level 3+)
        deepLevel: 13,      // was 15
        // Default font size fallback
        default: 14         // was 17
    },

    // Node dimensions - 15% 축소 후 20% 가로 확장
    node: {
        // Minimum width of nodes
        minWidth: 85,       // 노드 가로 70% 축소
        // Height of nodes
        height: 22,         // was 26
        // Padding
        paddingY: 4,        // was 5
        paddingX: 6,        // was 7.5
        // Border radius
        borderRadius: 5     // was 6
    },

    // Layout configuration - 15% 축소 후 20% 가로 확장
    layout: {
        // Horizontal spacing between levels
        horizontalSpacing: 260,     // 노드 200px + 간격 60px
        // Vertical spacing between sibling nodes
        verticalSpacing: 3,         // keep as is (too small)
        // Starting coordinates
        startX: 85,         // was 100
        startY: 43,         // was 50
        // Root node spacing
        rootSpacing: 13     // was 15
    },

    // Animation configuration
    animation: {
        // Hover scale factor
        hoverScale: 1.02,
        // Selected scale factor
        selectedScale: 1.02,
        // Animation duration in seconds
        duration: 0.3,
        // Transition duration in seconds
        transitionDuration: 0.2
    },

    // Button configuration - 15% 축소
    button: {
        // Button dimensions
        width: 19,          // was 22
        height: 19,         // was 22
        // Button font size
        fontSize: 10,       // was 12
        // Mobile button dimensions
        mobileWidth: 15,    // was 18
        mobileHeight: 15,   // was 18
        mobileFontSize: 8   // was 10
    },

    // Connector line configuration - 15% 축소
    connector: {
        // Line height
        height: 2,          // keep as is
        // Arrow dimensions
        arrowWidth: 7,      // was 8
        arrowHeight: 4      // was 5
    },

    // Mobile responsive breakpoint - 15% 축소
    mobile: {
        // Breakpoint width
        breakpoint: 768,    // keep as is (responsive breakpoint)
        // Mobile font size
        fontSize: 10,       // was 12
        // Mobile padding
        paddingY: 3,        // was 4
        paddingX: 7,        // was 8
        // Mobile minimum width
        minWidth: 68        // was 80
    },

    // Search highlight configuration
    search: {
        // Highlight box shadow color
        highlightColor: 'rgba(255,193,7,0.6)',
        // Pulse animation duration
        pulseDuration: 1.5
    },

    // Drag and drop configuration
    dragDrop: {
        // Dragging opacity
        draggingOpacity: 0.7,
        // Dragging rotation in degrees
        draggingRotation: 5,
        // Drop target box shadow
        dropTargetShadow: 'rgba(40,167,69,0.3)',
        // Position indicator height
        indicatorHeight: 3
    }
};

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindmapConfig;
}