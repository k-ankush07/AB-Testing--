import { useState, useEffect } from "react";

function PreviewTheme({ value, onChange }) {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("store/api/themes")
            .then((res) => res.json())
            .then((data) => setThemes(data.themes))
            .catch((err) => console.error("Failed to load themes:", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading}>
            {themes.map((t) => (
                <option key={t.id} value={t.id}>
                    {t.name} ({t.id}) {t.role === "main" ? "— Live" : ""}
                </option>
            ))}
        </select>
    );
}

export default PreviewTheme;