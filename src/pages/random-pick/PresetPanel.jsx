import { useState, useEffect } from "react";
import {
  Box, Tabs, Tab, Paper, Typography, TextField, Select, MenuItem,
  FormControlLabel, Switch, Button, Grid, Divider, CircularProgress,
} from "@mui/material";
import { getPresets, updatePreset, generatePicks } from "@/services/random-pick-services";

const PATTERN_LENGTH_OPTIONS = [0, 9, 11, 15, 16, 20];
const MAX_LINES_OPTIONS = [0, 30, 36, 42, 48];
const SAME_STREAK_OPTIONS = [0, 6, 7, 8, 9, 10];
const REPEAT_PATTERN_OPTIONS = [0, 6, 7, 8, 9, 10];
const LOSE_STREAK_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9];
const MARGIN_OPTIONS = [0, -3, -4, -5, -6, -7, -8, -9, -10];
const WAIT_OPTIONS = [0, 1, 2, 3, 4, 5];

export default function PresetPanel({ selectedPreset, onPresetChange, onPicksGenerated }) {
  const [presets, setPresets] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pickCount, setPickCount] = useState(10);

  // 편집용 로컬 상태
  const [form, setForm] = useState({});

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const res = await getPresets();
      setPresets(res.data);
      if (res.data.length > 0) {
        const idx = selectedPreset
          ? res.data.findIndex((p) => p.preset_seq === selectedPreset)
          : 0;
        const realIdx = idx >= 0 ? idx : 0;
        setTabIndex(realIdx);
        setForm(res.data[realIdx]);
        onPresetChange(res.data[realIdx]);
      }
    } catch (e) {
      console.error("Failed to load presets:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_, newValue) => {
    setTabIndex(newValue);
    const preset = presets[newValue];
    setForm(preset);
    onPresetChange(preset);
  };

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.preset_seq) return;
    setSaving(true);
    try {
      const res = await updatePreset(form.preset_seq, {
        pattern_length: form.pattern_length,
        max_lines: form.max_lines,
        max_same_streak: form.max_same_streak,
        max_repeat_pattern: form.max_repeat_pattern,
        lose_streak_trigger: form.lose_streak_trigger,
        margin_trigger: form.margin_trigger,
        reverse_pick: form.reverse_pick,
        wait_rounds: form.wait_rounds,
      });
      const updated = res.data;
      setPresets((prev) => prev.map((p) => (p.preset_seq === updated.preset_seq ? updated : p)));
      setForm(updated);
      onPresetChange(updated);
    } catch (e) {
      console.error("Failed to save preset:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.preset_seq) return;
    setGenerating(true);
    try {
      const res = await generatePicks(form.preset_seq, pickCount);
      if (onPicksGenerated) onPicksGenerated(res.data);
    } catch (e) {
      console.error("Failed to generate picks:", e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const SelectField = ({ label, field, options, formatLabel }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 160 }}>
      <Typography variant="caption" sx={{ minWidth: 60, fontSize: "0.7rem" }}>
        {label}
      </Typography>
      <Select
        size="small"
        value={form[field] ?? 0}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        sx={{ minWidth: 80, fontSize: "0.75rem" }}
      >
        {options.map((v) => (
          <MenuItem key={v} value={v} sx={{ fontSize: "0.75rem" }}>
            {formatLabel ? formatLabel(v) : (v === 0 ? "OFF" : v)}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  return (
    <Paper sx={{ p: 1.5, mb: 1 }}>
      {/* 프리셋 탭 */}
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 32, "& .MuiTab-root": { minHeight: 32, py: 0.5, fontSize: "0.8rem" } }}
      >
        {presets.map((p) => (
          <Tab key={p.preset_seq} label={p.name} />
        ))}
      </Tabs>

      <Divider sx={{ my: 1 }} />

      {/* 조건 설정 */}
      <Typography variant="caption" sx={{ fontWeight: "bold", mb: 0.5, display: "block" }}>
        조건 설정
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1 }}>
        <SelectField label="패턴매칭" field="pattern_length" options={PATTERN_LENGTH_OPTIONS} />
        <SelectField label="라인제한" field="max_lines" options={MAX_LINES_OPTIONS} />
        <SelectField label="동A패턴" field="max_same_streak" options={SAME_STREAK_OPTIONS}
          formatLabel={(v) => v === 0 ? "OFF" : `A${v}`} />
        <SelectField label="동B패턴" field="max_repeat_pattern" options={REPEAT_PATTERN_OPTIONS}
          formatLabel={(v) => v === 0 ? "OFF" : `B${v}`} />
      </Box>

      {/* 게임 설정 */}
      <Typography variant="caption" sx={{ fontWeight: "bold", mb: 0.5, display: "block" }}>
        게임 설정
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}>
        <SelectField label="연패" field="lose_streak_trigger" options={LOSE_STREAK_OPTIONS} />
        <SelectField label="승마진" field="margin_trigger" options={MARGIN_OPTIONS} />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={form.reverse_pick || false}
              onChange={(e) => handleFieldChange("reverse_pick", e.target.checked)}
            />
          }
          label={<Typography variant="caption">반대픽</Typography>}
          sx={{ ml: 0.5 }}
        />
        <SelectField label="대기" field="wait_rounds" options={WAIT_OPTIONS} />
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* 액션 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button variant="contained" size="small" onClick={handleSave} disabled={saving}>
          {saving ? "저장중..." : "설정 저장"}
        </Button>
        <TextField
          size="small"
          type="number"
          value={pickCount}
          onChange={(e) => setPickCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
          sx={{ width: 70, "& input": { fontSize: "0.75rem", py: 0.5 } }}
          inputProps={{ min: 1, max: 100 }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleGenerate}
          disabled={generating}
          color="success"
        >
          {generating ? "생성중..." : "픽 생성"}
        </Button>
      </Box>
    </Paper>
  );
}
