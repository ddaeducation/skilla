import { Settings2, Sun, Moon, RotateCcw, Type, ALargeSmall, Space, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useAccessibility } from "@/hooks/useAccessibility";

const AccessibilityPanel = () => {
  const { settings, updateSetting, resetSettings } = useAccessibility();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Accessibility settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Accessibility Settings</TooltipContent>
      </Tooltip>

      <PopoverContent
        className="w-80 p-0"
        align="end"
        role="dialog"
        aria-label="Accessibility settings panel"
      >
        <div className="p-4 space-y-1">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Accessibility Settings
          </h3>
          <p className="text-xs text-muted-foreground">Customize your reading experience</p>
        </div>

        <Separator />

        <div className="p-4 space-y-5">
          {/* Text Size */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <ALargeSmall className="h-3.5 w-3.5" />
              Text Size: {settings.fontSize}%
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">A</span>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([v]) => updateSetting("fontSize", v)}
                min={75}
                max={150}
                step={5}
                aria-label="Adjust text size"
                className="flex-1"
              />
              <span className="text-base font-bold text-muted-foreground">A</span>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Type className="h-3.5 w-3.5" />
              Font
            </Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(v) => updateSetting("fontFamily", v as any)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Choose font family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Inter)</SelectItem>
                <SelectItem value="dyslexia">Dyslexia-Friendly</SelectItem>
                <SelectItem value="serif">Serif (Georgia)</SelectItem>
                <SelectItem value="mono">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Spacing */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Space className="h-3.5 w-3.5" />
              Spacing
            </Label>
            <Select
              value={settings.spacing}
              onValueChange={(v) => updateSetting("spacing", v as any)}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Choose text spacing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="relaxed">Relaxed</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Dark Mode */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-2 cursor-pointer" htmlFor="a11y-dark">
              {settings.darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              Dark Mode
            </Label>
            <Switch
              id="a11y-dark"
              checked={settings.darkMode}
              onCheckedChange={(v) => updateSetting("darkMode", v)}
              aria-label="Toggle dark mode"
            />
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-2 cursor-pointer" htmlFor="a11y-contrast">
              <Eye className="h-3.5 w-3.5" />
              High Contrast
            </Label>
            <Switch
              id="a11y-contrast"
              checked={settings.highContrast}
              onCheckedChange={(v) => updateSetting("highContrast", v)}
              aria-label="Toggle high contrast mode"
            />
          </div>

          <Separator />

          {/* Reset */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetSettings}
            className="w-full text-xs h-8"
            aria-label="Reset all accessibility settings to defaults"
          >
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset to Defaults
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AccessibilityPanel;
