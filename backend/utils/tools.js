/**
 * Code Analysis Tools
 * These tools run on the backend to provide structural context to the AI Agent.
 * This makes the agent "tool-augmented" allowing it to reason about complexity and metrics
 * without having to guess from raw text.
 */

const analyzeComplexity = (code) => {
    let loopCount = 0;
    let recursiveCalls = 0;
    
    // Very basic static analysis (RegEx based for simplicity)
    const loops = code.match(/(for|while)\s*\(/g);
    if (loops) loopCount = loops.length;
    
    // Extract function names to check for recursion
    const funcMatch = code.match(/function\s+([a-zA-Z0-9_]+)|const\s+([a-zA-Z0-9_]+)\s*=\s*(function|\([^)]*\)\s*=>)/g);
    
    let timeComplexity = 'O(1) or O(N)';
    if (loopCount === 1) timeComplexity = 'O(N)';
    if (loopCount === 2) timeComplexity = 'O(N²) (Nested loops likely)';
    if (loopCount > 2) timeComplexity = 'O(N³) or higher';
    
    return {
        loopCount,
        estimatedTimeComplexity: timeComplexity
    };
};

const countCodeMetrics = (code) => {
    const lines = code.split('\n');
    const loc = lines.length;
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*') || l.trim().startsWith('*')).length;
    const functions = (code.match(/function|=>/g) || []).length;
    
    return {
        loc,
        commentLines,
        functions,
        commentRatio: loc > 0 ? ((commentLines / loc) * 100).toFixed(1) + '%' : '0%'
    };
};

const detectPatterns = (code) => {
    const patterns = [];
    if (code.includes('class') && code.includes('static instance') && code.includes('getInstance')) {
        patterns.push('Singleton');
    }
    if (code.includes('subscribe') || code.includes('addEventListener') || code.includes('notify')) {
        patterns.push('Observer / PubSub');
    }
    if (code.includes('create') && (code.includes('switch') || code.includes('if')) && code.includes('return new')) {
        patterns.push('Factory');
    }
    
    return patterns.length > 0 ? patterns : ['No standard design patterns detected'];
};

const runAllTools = (code) => {
    try {
        const complexity = analyzeComplexity(code);
        const metrics = countCodeMetrics(code);
        const patterns = detectPatterns(code);
        
        return `Complexity Analysis: ${complexity.estimatedTimeComplexity} — ${complexity.loopCount} loops detected
Code Metrics: ${metrics.loc} LOC, ${metrics.functions} functions, ${metrics.commentRatio} comments
Patterns Detected: ${patterns.join(', ')}`;
    } catch (e) {
        return 'Tool analysis failed to run.';
    }
};

module.exports = {
    analyzeComplexity,
    countCodeMetrics,
    detectPatterns,
    runAllTools
};
