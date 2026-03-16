'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGradientGenerator } from '@/hooks/useGradientGenerator';
import { colorPresets } from '@/lib/constants';
import { colorToParam } from '@/lib/utils';
import { getHarmonyColors } from '@/lib/colorHarmony';
import { Download, RefreshCw, Plus, Trash2, Palette, Sparkles, Layers, Code, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GradientGenerator() {
  const {
    colors,
    setColors,
    width,
    setWidth,
    height,
    setHeight,
    svgContent,
    isGenerating,
    generateGradient,
    downloadGradient
  } = useGradientGenerator();

  const [newColor, setNewColor] = useState('');
  const [apiLinkCopied, setApiLinkCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [colorMode, setColorMode] = useState<'free' | 'recommended'>('free');
  const [baseColor, setBaseColor] = useState('#5135FF');
  const [recommendedColors, setRecommendedColors] = useState<string[]>(() =>
    getHarmonyColors('#5135FF', 'auto')
  );
  const [wheelColorA, setWheelColorA] = useState<string>('#5135FF');
  const [wheelColorB, setWheelColorB] = useState<string | null>(null);
  const [nextWheelTarget, setNextWheelTarget] = useState<'A' | 'B'>('A');

  useEffect(() => {
    setMounted(true);
    generateGradient();
  }, [generateGradient]);

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
  };

  const addColor = () => {
    if (newColor && colors.length < 8) {
      setColors([...colors, newColor]);
      setNewColor('');
    }
  };

  const removeColor = (index: number) => {
    if (colors.length > 1) {
      const newColors = colors.filter((_, i) => i !== index);
      setColors(newColors);
    }
  };

  const applyPreset = (preset: typeof colorPresets[0]) => {
    setColors(preset.colors);
  };

  const generateApiLink = () => {
    if (!mounted) return '';
    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/api`
      : '/api';
    const params = new URLSearchParams();
    colors.forEach(color => params.append('colors', colorToParam(color)));
    params.append('width', width.toString());
    params.append('height', height.toString());
    return `${baseUrl}?${params.toString()}`;
  };

  const updateRecommendations = (color: string) => {
    const safe = color || '#5135FF';
    const rec = getHarmonyColors(safe, 'auto');
    setRecommendedColors(rec);
  };

  const handleBaseColorChange = (color: string) => {
    setBaseColor(color);
    updateRecommendations(color);
  };

  const applyRecommendedColors = () => {
    const fromWheel: string[] = wheelColorB
      ? [wheelColorA, wheelColorB]
      : [wheelColorA];

    const rest = recommendedColors.filter((c) => !fromWheel.includes(c));
    const combined = [...fromWheel, ...rest].slice(0, 8);

    setColors(combined);
  };

  const handleWheelClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const angle = Math.atan2(dy, dx); // -PI ~ PI, 以 x 轴为 0°
    let hue = (angle * 180) / Math.PI;
    hue = (hue + 360) % 360;
    // 固定饱和度和亮度，得到色轮上的纯色
    const s = 0.85;
    const l = 0.55;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (hue >= 0 && hue < 60) {
      r = c;
      g = x;
    } else if (hue >= 60 && hue < 120) {
      r = x;
      g = c;
    } else if (hue >= 120 && hue < 180) {
      g = c;
      b = x;
    } else if (hue >= 180 && hue < 240) {
      g = x;
      b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }

    const to255 = (v: number) => Math.round((v + m) * 255);
    const toHex = (v: number) => v.toString(16).padStart(2, '0').toUpperCase();

    const R = to255(r);
    const G = to255(g);
    const B = to255(b);
    const hex = `#${toHex(R)}${toHex(G)}${toHex(B)}`;

    // 更新推荐算法的基准色
    handleBaseColorChange(hex);

    // 在两个锚点颜色之间轮流写入
    if (nextWheelTarget === 'A') {
      setWheelColorA(hex);
      setNextWheelTarget('B');
    } else {
      setWheelColorB(hex);
      setNextWheelTarget('A');
    }

    // 根据当前模式，直接响应到渐变颜色列表
    if (colorMode === 'recommended') {
      // 推荐模式：使用两个锚点色 + 推荐结果，直接覆盖 colors
      const fromWheel: string[] = wheelColorB
        ? [wheelColorA, hex] // 第二个点刚刚选择，用最新的 hex
        : [hex];

      const rest = getHarmonyColors(hex, 'auto').filter(
        (c) => !fromWheel.includes(c)
      );
      const combined = [...fromWheel, ...rest].slice(0, 8);
      setColors(combined);
    } else {
      // 自由模式：将点击得到的颜色直接加入当前 colors（上限 8 个）
      const exists = colors.includes(hex);
      if (!exists) {
        const nextColors =
          colors.length < 8 ? [...colors, hex] : [...colors.slice(1), hex];
        setColors(nextColors);
      }
    }
  };

  const copyApiLink = async () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        const apiLink = generateApiLink();
        await navigator.clipboard.writeText(apiLink);
        setApiLinkCopied(true);
        setTimeout(() => setApiLinkCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy API link:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2 animate-fade-in">
            <Palette className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground tracking-tight">
            Gradient Generator
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
            Create stunning, randomized SVG gradients for your next project. 
            <span className="text-primary font-medium ml-1">Simple, fast, and open source.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Preview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-1.5 sm:p-2">
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center border border-border/50">
                {svgContent ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                    className="w-full h-full transform transition-transform duration-500 hover:scale-[1.01] [&>svg]:w-full [&>svg]:h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-muted border-t-primary"></div>
                    <span className="text-sm font-medium font-display">Generating...</span>
                  </div>
                )}
                
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button 
                    onClick={generateGradient} 
                    disabled={isGenerating}
                    size="sm"
                    className="bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-foreground shadow-sm backdrop-blur-sm border border-black/5 dark:border-white/10"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
               <Button 
                onClick={downloadGradient} 
                disabled={!svgContent}
                className="flex-1 h-12 text-base font-medium shadow-md hover:shadow-lg transition-all"
              >
                <Download className="w-5 h-5 mr-2" />
                Download SVG
              </Button>
              <Button 
                variant="outline"
                className="flex-1 h-12 text-base font-medium border-2 hover:bg-muted/50"
                onClick={copyApiLink}
              >
                 <Code className="w-5 h-5 mr-2" />
                 {apiLinkCopied ? 'Link Copied!' : 'Copy API Link'}
              </Button>
            </div>

            {/* API Section */}
            <div className="bg-muted/30 rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-2 font-display text-lg font-semibold">
                <Zap className="w-5 h-5 text-chart-2" />
                <span>Developer API</span>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 font-mono text-xs sm:text-sm text-muted-foreground break-all shadow-sm">
                {generateApiLink() || 'Loading...'}
              </div>
               <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Hex colors required</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-chart-2"></div>
                    <span>Auto-optimized</span>
                  </div>
                </div>
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Dimensions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                 <Layers className="w-5 h-5 text-primary" />
                 <h2 className="font-display font-semibold text-lg">Dimensions</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Width</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">px</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Height</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Colors</h2>
                </div>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground">
                  {colors.length}/8
                </span>
              </div>

              {/* 统一色轮（自由模式与推荐模式都可点击直接生效） */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="w-32 h-32 rounded-full border border-border shadow-inner cursor-crosshair"
                  style={{
                    background:
                      'conic-gradient(from 0deg, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)',
                  }}
                  onClick={handleWheelClick}
                />
                <span className="text-[11px] text-muted-foreground text-center">
                  {colorMode === 'recommended'
                    ? '在色轮上点击，可选择最多两个锚点色，并自动生成推荐配色'
                    : '在色轮上点击，直接将该颜色加入当前渐变颜色列表'}
                </span>
              </div>

              {/* 模式切换：自由选择 / 推荐模式 */}
              <div className="inline-flex rounded-full border border-border bg-muted/60 p-1 text-xs font-medium">
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1 rounded-full transition-colors',
                    colorMode === 'free'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => setColorMode('free')}
                >
                  自由选择
                </button>
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1 rounded-full transition-colors',
                    colorMode === 'recommended'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => setColorMode('recommended')}
                >
                  推荐模式
                </button>
              </div>

              {colorMode === 'free' && (
                <>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {colors.map((color, index) => (
                      <div key={index} className="flex items-center gap-3 group">
                        <div className="relative flex-shrink-0">
                          <Input
                            type="color"
                            value={color}
                            onChange={(e) => handleColorChange(index, e.target.value)}
                            className="w-12 h-12 p-1 rounded-xl cursor-pointer border-2 hover:border-primary transition-colors"
                          />
                        </div>
                        <Input
                          type="text"
                          value={color.toUpperCase()}
                          onChange={(e) => handleColorChange(index, e.target.value)}
                          className="font-mono text-sm tracking-wider uppercase"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColor(index)}
                          disabled={colors.length <= 1}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {colors.length < 8 && (
                    <div className="flex items-center gap-3 pt-2">
                      <div className="relative flex-shrink-0">
                        <Input
                          type="color"
                          value={newColor || '#000000'}
                          onChange={(e) => setNewColor(e.target.value)}
                          className="w-12 h-12 p-1 rounded-xl cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
                        />
                      </div>
                      <Input
                        type="text"
                        placeholder="#000000"
                        value={newColor.toUpperCase()}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="font-mono text-sm tracking-wider uppercase"
                      />
                      <Button
                        onClick={addColor}
                        disabled={!newColor}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}

              {colorMode === 'recommended' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] gap-4 items-center">
                    {/* 基准色与推荐结果 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          value={baseColor}
                          onChange={(e) => handleBaseColorChange(e.target.value)}
                          className="w-12 h-12 p-1 rounded-xl cursor-pointer border-2 hover:border-primary transition-colors"
                        />
                        <Input
                          type="text"
                          value={baseColor.toUpperCase()}
                          onChange={(e) => handleBaseColorChange(e.target.value)}
                          className="font-mono text-sm tracking-wider uppercase"
                        />
                      </div>

                      {/* 色轮选中的两个锚点颜色 */}
                      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>颜色 1：</span>
                          <span
                            className="w-4 h-4 rounded-full border border-border/60"
                            style={{ backgroundColor: wheelColorA }}
                          />
                          <span className="font-mono">
                            {wheelColorA.toUpperCase()}
                          </span>
                        </div>
                        {wheelColorB && (
                          <div className="flex items-center gap-2">
                            <span>颜色 2：</span>
                            <span
                              className="w-4 h-4 rounded-full border border-border/60"
                              style={{ backgroundColor: wheelColorB }}
                            />
                            <span className="font-mono">
                              {wheelColorB.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            推荐颜色组合（基于互补 / 类似 / 三分配色）
                          </span>
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={applyRecommendedColors}
                          >
                            应用到渐变
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recommendedColors.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-mono bg-background hover:border-primary/80 transition-colors"
                              onClick={() => handleBaseColorChange(c)}
                            >
                              <span
                                className="w-4 h-4 rounded-full border border-border/60"
                                style={{ backgroundColor: c }}
                              />
                              <span>{c.toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Presets */}
             <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                 <Sparkles className="w-5 h-5 text-primary" />
                 <h2 className="font-display font-semibold text-lg">Presets</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="group relative overflow-hidden rounded-lg aspect-[3/2] border border-border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div 
                      className="absolute inset-0" 
                      style={{ background: `linear-gradient(135deg, ${preset.colors.join(', ')})` }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                      <span className="text-xs font-medium text-white drop-shadow-sm">
                        {preset.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
