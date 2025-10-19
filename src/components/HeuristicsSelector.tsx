import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { HEURISTIC_SETS, INDIVIDUAL_HEURISTICS, getHeuristicsForSet } from "@/lib/heuristics";

interface HeuristicsSelectorProps {
  value: {
    set: string;
    custom?: string[];
  };
  onChange: (value: { set: string; custom?: string[] }) => void;
}

export function HeuristicsSelector({ value, onChange }: HeuristicsSelectorProps) {
  const [selectedSet, setSelectedSet] = useState(value.set || "nn_10");
  const [customHeuristics, setCustomHeuristics] = useState<string[]>(value.custom || []);

  const handleSetChange = (newSet: string) => {
    setSelectedSet(newSet);
    if (newSet === "custom") {
      onChange({ set: newSet, custom: customHeuristics });
    } else {
      onChange({ set: newSet });
    }
  };

  const handleCustomToggle = (heuristicValue: string, checked: boolean) => {
    const updated = checked
      ? [...customHeuristics, heuristicValue]
      : customHeuristics.filter((h) => h !== heuristicValue);
    setCustomHeuristics(updated);
    onChange({ set: "custom", custom: updated });
  };

  const selectedSetInfo = HEURISTIC_SETS.find((s) => s.value === selectedSet);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="heuristic-set">Heuristic Set</Label>
        <Select value={selectedSet} onValueChange={handleSetChange}>
          <SelectTrigger id="heuristic-set">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HEURISTIC_SETS.map((set) => (
              <SelectItem key={set.value} value={set.value}>
                {set.label}
                {set.count && ` (${set.count})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedSetInfo && (
          <p className="text-sm text-muted-foreground">{selectedSetInfo.description}</p>
        )}
      </div>

      {selectedSet === "custom" && (
        <Card>
          <CardContent className="pt-6">
            <CardDescription className="mb-4">
              Select specific heuristics to include in your analysis
            </CardDescription>
            <div className="grid gap-4 md:grid-cols-2">
              {INDIVIDUAL_HEURISTICS.map((heuristic) => (
                <div key={heuristic.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={heuristic.value}
                    checked={customHeuristics.includes(heuristic.value)}
                    onCheckedChange={(checked) =>
                      handleCustomToggle(heuristic.value, checked as boolean)
                    }
                  />
                  <div className="space-y-1 leading-none">
                    <Label
                      htmlFor={heuristic.value}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {heuristic.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {heuristic.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {customHeuristics.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                {customHeuristics.length} heuristic{customHeuristics.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
