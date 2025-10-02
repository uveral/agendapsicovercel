import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, TrendingUp } from "lucide-react";

interface Suggestion {
  id: string;
  therapistName: string;
  day: string;
  time: string;
  matchScore: number;
  reason: string;
}

interface SuggestionsPanelProps {
  clientName: string;
  currentSlot?: string;
  suggestions: Suggestion[];
  onApply: (suggestionId: string) => void;
  onDismiss: () => void;
}

export function SuggestionsPanel({
  clientName,
  currentSlot,
  suggestions,
  onApply,
  onDismiss,
}: SuggestionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Opciones de Reasignación
        </CardTitle>
        <CardDescription>
          Cliente: <span className="font-medium text-foreground">{clientName}</span>
          {currentSlot && (
            <span className="ml-2 text-xs">
              (Actual: {currentSlot})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay sugerencias disponibles en este momento
          </div>
        ) : (
          suggestions.map((suggestion, index) => (
            <Card key={suggestion.id} className="hover-elevate" data-testid={`card-suggestion-${suggestion.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" data-testid={`badge-rank-${suggestion.id}`}>
                        #{index + 1}
                      </Badge>
                      <Badge variant="secondary" data-testid={`badge-match-${suggestion.id}`}>
                        {suggestion.matchScore}% match
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{suggestion.therapistName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{suggestion.day}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{suggestion.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {suggestion.reason}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onApply(suggestion.id)}
                    data-testid={`button-apply-${suggestion.id}`}
                  >
                    Aplicar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={onDismiss}
            data-testid="button-dismiss"
          >
            Cerrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
