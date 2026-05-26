import { pool } from '../config/db.js';

export async function getAnalytics(req, res, next) {
  try {
    const userId = req.user.id;
    
    // 1. Heatmap Data
    const heatmapQuery = `
      SELECT to_char(timezone('Asia/Kolkata', completed_at), 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM tasks
      WHERE user_id = $1 
      AND is_completed = true 
      AND completed_at > NOW() - INTERVAL '1 year'
      GROUP BY date
    `;
    const heatmapRes = await pool.query(heatmapQuery, [userId]);
    
    const heatmap = heatmapRes.rows.map(r => ({
      date: r.date,
      count: parseInt(r.count),
      level: Math.min(4, Math.ceil(parseInt(r.count) / 2))
    }));

    // 2. Peak Flow Data (Adjusted for local timezone)
    const peakFlowQuery = `
      SELECT EXTRACT(HOUR FROM timezone('Asia/Kolkata', completed_at)) as hour, COUNT(*) as count
      FROM tasks
      WHERE user_id = $1 AND is_completed = true
      GROUP BY hour
      ORDER BY hour
    `;
    const peakFlowRes = await pool.query(peakFlowQuery, [userId]);
    
    const peakFlow = Array(24).fill(0).map((_, i) => {
        const found = peakFlowRes.rows.find(r => parseInt(r.hour) === i);
        return { hour: i, count: found ? parseInt(found.count) : 0 };
    });

    // 3. Category Distribution
    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM tasks 
      WHERE user_id = $1 AND is_completed = true
      GROUP BY category
      ORDER BY count DESC
    `;
    const catRes = await pool.query(categoryQuery, [userId]);

    let totalCompleted = 0;
    const counts = {};

    catRes.rows.forEach(row => {
        const cat = row.category ? row.category.trim().toUpperCase() : 'OTHERS';
        const count = parseInt(row.count);
        counts[cat] = (counts[cat] || 0) + count;
        totalCompleted += count;
    });

    const distribution = Object.entries(counts)
        .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(), 
            count: count,
            percent: totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

    return res.json({
        heatmap,
        peakFlow,
        distribution 
    });

  } catch (err) { 
    return next(err); 
  }
}