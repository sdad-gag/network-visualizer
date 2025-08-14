class NetworkVisualizer {
    constructor(container) {
        this.container = container;
        this.network = null;
        this.data = {
            nodes: new vis.DataSet(),
            edges: new vis.DataSet()
        };
        
        this.options = {
            layout: {
                improvedLayout: true,
                randomSeed: 2,
                clusterThreshold: 150
            },
            physics: {
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 25
                },
                barnesHut: {
                    gravitationalConstant: -80000,
                    centralGravity: 0.3,
                    springLength: 200,
                    springConstant: 0.05,
                    damping: 0.09,
                    avoidOverlap: 0.1
                },
                minVelocity: 0.75,
                maxVelocity: 30
            },
            nodes: {
                shape: 'dot',
                scaling: {
                    min: 10,
                    max: 30,
                    label: {
                        enabled: true,
                        min: 8,
                        max: 20,
                        maxVisible: 20,
                        drawThreshold: 5
                    }
                },
                font: {
                    size: 12,
                    face: 'Arial',
                    color: '#333333'
                },
                borderWidth: 2,
                shadow: true
            },
            edges: {
                width: 0.5,
                color: {
                    inherit: 'from',
                    opacity: 0.3,
                    color: '#848484',
                    highlight: '#1B1B1B'
                },
                smooth: {
                    type: 'continuous',
                    forceDirection: 'none',
                    roundness: 0.5
                },
                shadow: true
            },
            groups: {
                cluster_0: { color: { background: '#FFD700', border: '#B8860B' } },
                cluster_1: { color: { background: '#90EE90', border: '#006400' } },
                cluster_2: { color: { background: '#87CEEB', border: '#4682B4' } },
                cluster_3: { color: { background: '#DDA0DD', border: '#800080' } },
                cluster_4: { color: { background: '#F08080', border: '#CD5C5C' } },
                cluster_5: { color: { background: '#98FB98', border: '#228B22' } }
            },
            interaction: {
                hover: true,
                zoomView: true,
                dragView: true,
                navigationButtons: true
            }
        };
        
        this.init();
    }
    
    checkInitialization() {
        if (!this.network) {
            console.error("Network not initialized!");
            return false;
        }
        return true;
    }

    init() {
        console.log('Initializing NetworkVisualizer...');
        try {
            this.network = new vis.Network(this.container, this.data, this.options);
            this.setupEventListeners();
            console.log('NetworkVisualizer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize NetworkVisualizer:', error);
        }
    }
    
    setupEventListeners() {
        // Zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => this.network.zoom(1.2));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.network.zoom(0.8));
        document.getElementById('resetView')?.addEventListener('click', () => this.network.fit());
        
        // Analysis button
        document.getElementById('analyzeNetworkBtn')?.addEventListener('click', () => this.analyzeNetwork());
        
        // Search functionality
        document.getElementById('nodeSearch')?.addEventListener('input', (e) => this.searchNodes(e.target.value));

        // Node hover events
        this.network.on("hoverNode", (params) => this.showNodeTooltip(params));
        this.network.on("blurNode", () => this.hideNodeTooltip());
        
        // Export button
        document.getElementById('exportNetworkBtn')?.addEventListener('click', () => this.exportNetwork());
    }
    
    showNodeTooltip(params) {
        const node = this.data.nodes.get(params.node);
        if (!node) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'node-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-header">${node.label}</div>
            <div class="tooltip-content">
                <div>Cluster: ${node.group || 'N/A'}</div>
                <div>Centrality: ${(node.centrality_score || 0).toFixed(3)}</div>
                ${node.publications ? `<div>Publications: ${node.publications}</div>` : ''}
            </div>
        `;
        
        const container = this.container;
        const rect = container.getBoundingClientRect();
        const x = params.event.clientX - rect.left;
        const y = params.event.clientY - rect.top;
        
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y + 10}px`;
        
        container.appendChild(tooltip);
    }

    hideNodeTooltip() {
        const tooltips = this.container.getElementsByClassName('node-tooltip');
        Array.from(tooltips).forEach(tooltip => tooltip.remove());
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon"></div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    async analyzeNetwork() {
        try {
            const nodes = this.data.nodes.get();
            const edges = this.data.edges.get();
            
            if (!nodes.length || !edges.length) {
                this.showToast('Harap unggah data jaringan terlebih dahulu', 'warning');
                return;
            }
            
            this.showToast('Menganalisis jaringan...', 'info');
            
            const response = await fetch('/api/analyze_network', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nodes, edges })
            });
            
            if (!response.ok) {
                throw new Error('Gagal menganalisis jaringan');
            }
            
            const data = await response.json();
            this.updateAnalysisDisplay(data.result);
            this.showToast('Analisis jaringan selesai', 'success');
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showToast('Gagal menganalisis jaringan: ' + error.message, 'error');
        }
    }
    
    updateAnalysisDisplay(analysis) {
        if (!this.checkInitialization()) return;

        try {
            // Update metrics
            const elements = {
                nodeCount: document.getElementById('nodeCount'),
                edgeCount: document.getElementById('edgeCount'),
                density: document.getElementById('density'),
                componentCount: document.getElementById('componentCount')
            };
            
            if (elements.nodeCount) elements.nodeCount.textContent = analysis.num_nodes;
            if (elements.edgeCount) elements.edgeCount.textContent = analysis.num_edges;
            if (elements.density) elements.density.textContent = (analysis.density * 100).toFixed(1) + '%';
            if (elements.componentCount) elements.componentCount.textContent = analysis.components.length;
            
            // Highlight important nodes
            this.highlightImportantNodes(analysis.key_nodes);
        } catch (error) {
            console.error('Error updating analysis display:', error);
            this.showToast('Failed to update analysis display', 'error');
        }
    }
    
    highlightImportantNodes(nodeIds) {
        this.data.nodes.update(
            this.data.nodes.get().map(node => ({
                ...node,
                color: nodeIds.includes(node.id) 
                    ? {background: '#4cc9f0', border: '#0077b6'}
                    : undefined,
                size: nodeIds.includes(node.id) ? 25 : 16
            }))
        );
    }
    
    searchNodes(query) {
        if (!query) {
            this.highlightImportantNodes([]);
            return;
        }
        
        const matchingNodes = this.data.nodes.get().filter(node => 
            node.label?.toLowerCase().includes(query.toLowerCase())
        );
        
        this.highlightImportantNodes(matchingNodes.map(n => n.id));
    }

    exportNetwork() {
        const data = {
            nodes: this.data.nodes.get(),
            edges: this.data.edges.get(),
            analysis: this.lastAnalysis
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'network-analysis.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Data berhasil diekspor', 'success');
    }
}
