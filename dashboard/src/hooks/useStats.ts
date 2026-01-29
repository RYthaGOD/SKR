import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';

export const useStats = () => {
    const [stats, setStats] = useState<any>(null);
    const [cycleProgress, setCycleProgress] = useState(0);

    // Poll Stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/stats`);
                const data = await res.json();
                setStats(data);
            } catch (e) {
                console.error("Stats fetch failed", e);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calculate Cycle Progress
    useEffect(() => {
        if (!stats?.cycleParams?.nextCycle) return;
        const updateProgress = () => {
            const total = 5 * 60 * 1000; // 5 mins standard
            const elapsed = Date.now() - stats.cycleParams.lastCycle;
            const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
            setCycleProgress(percent);
        };
        updateProgress();
        const pInterval = setInterval(updateProgress, 1000);
        return () => clearInterval(pInterval);
    }, [stats]);

    return { stats, cycleProgress };
}
