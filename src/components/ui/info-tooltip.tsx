import * as React from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  contentKey: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({ contentKey, side = "top" }: InfoTooltipProps) {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label={t("tooltips.common.moreInfo")}
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className="max-w-[280px] text-sm text-muted-foreground"
      >
        {t(contentKey)}
      </PopoverContent>
    </Popover>
  );
}

interface ActionTooltipProps {
  contentKey: string;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function ActionTooltip({
  contentKey,
  side = "top",
  children,
}: ActionTooltipProps) {
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{t(contentKey)}</TooltipContent>
    </Tooltip>
  );
}
