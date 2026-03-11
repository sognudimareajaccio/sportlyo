import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const DateTimePicker = ({ value, onChange, placeholder = "Choisir une date", testId }) => {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(value) : null;
  const hours = selectedDate ? String(selectedDate.getHours()).padStart(2, '0') : '09';
  const minutes = selectedDate ? String(selectedDate.getMinutes()).padStart(2, '0') : '00';

  const handleDateSelect = (day) => {
    if (!day) return;
    const d = new Date(day);
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    onChange(iso);
  };

  const handleTimeChange = (type, val) => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    if (type === 'hours') d.setHours(parseInt(val));
    if (type === 'minutes') d.setMinutes(parseInt(val));
    d.setSeconds(0);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    onChange(iso);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-testid={testId}
          className={cn(
            "w-full justify-start text-left font-normal h-10 border-slate-300",
            !value && "text-slate-400"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-brand" />
          {selectedDate
            ? format(selectedDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })
            : placeholder
          }
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white border-slate-200 shadow-xl" align="start">
        <div className="p-3 border-b border-slate-100 bg-asphalt">
          <p className="text-sm font-heading text-white uppercase tracking-wide">
            {selectedDate
              ? format(selectedDate, "MMMM yyyy", { locale: fr })
              : "Choisir une date"
            }
          </p>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={fr}
          disabled={{ before: new Date() }}
          className="p-3"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-heading font-bold capitalize",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent border border-slate-200 rounded-sm p-0 opacity-60 hover:opacity-100 hover:border-brand hover:text-brand transition-colors inline-flex items-center justify-center",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-slate-500 rounded-sm w-9 font-heading font-bold text-[0.7rem] uppercase",
            row: "flex w-full mt-1",
            cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-brand/10 [&:has([aria-selected])]:rounded-sm",
            day: "h-9 w-9 p-0 font-normal rounded-sm hover:bg-slate-100 transition-colors inline-flex items-center justify-center",
            day_selected: "bg-brand text-white hover:bg-brand hover:text-white focus:bg-brand focus:text-white font-bold",
            day_today: "border-2 border-brand text-brand font-bold",
            day_outside: "text-slate-300",
            day_disabled: "text-slate-200",
          }}
        />
        {/* Time picker */}
        <div className="border-t border-slate-100 p-3 flex items-center gap-3 bg-slate-50">
          <Clock className="h-4 w-4 text-brand" />
          <span className="text-sm font-heading text-slate-600">Heure :</span>
          <select
            value={hours}
            onChange={(e) => handleTimeChange('hours', e.target.value)}
            className="bg-white border border-slate-200 rounded-sm px-2 py-1 text-sm font-mono focus:border-brand focus:ring-1 focus:ring-brand outline-none"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={String(i).padStart(2, '0')}>
                {String(i).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="text-slate-400 font-bold">:</span>
          <select
            value={minutes}
            onChange={(e) => handleTimeChange('minutes', e.target.value)}
            className="bg-white border border-slate-200 rounded-sm px-2 py-1 text-sm font-mono focus:border-brand focus:ring-1 focus:ring-brand outline-none"
          >
            {['00', '15', '30', '45'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <Button
            size="sm"
            className="ml-auto bg-brand hover:bg-brand/90 text-white text-xs"
            onClick={() => setOpen(false)}
          >
            Valider
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateTimePicker;
