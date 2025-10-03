import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { User } from "@shared/schema";

interface ClientComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  clients: User[];
  placeholder?: string;
  testId?: string;
}

export function ClientCombobox({
  value,
  onValueChange,
  clients,
  placeholder = "Seleccionar cliente...",
  testId,
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedClient = clients.find((client) => client.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid={testId}
        >
          {selectedClient
            ? `${selectedClient.firstName} ${selectedClient.lastName}`
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar cliente..."
            data-testid={testId ? `${testId}-input` : undefined}
          />
          <CommandList>
            <CommandEmpty>No se encontraron clientes</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`${client.firstName} ${client.lastName}`}
                  onSelect={() => {
                    onValueChange(client.id);
                    setOpen(false);
                  }}
                  data-testid={testId ? `${testId}-item-${client.id}` : undefined}
                >
                  {client.firstName} {client.lastName}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
