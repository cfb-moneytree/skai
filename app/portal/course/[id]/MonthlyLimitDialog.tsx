import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MonthlyLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  remainingPlays: number;
  totalLimit: number;
}

export function MonthlyLimitDialog({ isOpen, onClose, remainingPlays, totalLimit }: MonthlyLimitDialogProps) {
  // Calculate days until next month
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysUntilReset = lastDayOfMonth - today.getDate();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Monthly Play Limit</DialogTitle>
          <DialogDescription className="text-slate-300 space-y-2">
            {remainingPlays > 0 ? (
              <>
                <p>You have {remainingPlays} out of {totalLimit} plays remaining this month.</p>
                <p className="text-sm text-slate-400">Your plays will reset in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}.</p>
              </>
            ) : (
              <>
                <p>You have reached your monthly play limit for this course.</p>
                <p className="text-sm text-slate-400">Your plays will reset in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}, at the start of next month.</p>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}