import { useTranslations } from "next-intl";
import { useState } from "react"
import axios from "axios"
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

export function YearWrapCard() {
    const t = useTranslations("Auto");
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [confirmText, setConfirmText] = useState("")

  const [isRestoreOpen, setIsRestoreOpen] = useState(false)
  
  const handleWrap = async () => {
    // ... existing handleWrap logic
    if (confirmText !== `CONFIRM_WRAP_${year}`) {
      toast.error(t("hibás_megerősítő_kód"))
      return
    }

    try {
      setLoading(true)
      const response = await axios.post("/api/admin/year-wrap", {
        year,
        confirm: confirmText
      })

      if (response.data.success) {
        toast.success(`Sikeres évzárás! Feldolgozva: ${response.data.processed}, Kiosztott címek: ${response.data.honorsAwarded}`)
        setIsOpen(false)
        setConfirmText("")
      }
    } catch (error: any) {
      console.error("Year wrap error:", error)
      toast.error(error.response?.data?.error || "Hiba történt az évzárás során")
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    if (confirmText !== `CONFIRM_RESTORE_${year}`) {
      toast.error(t("hibás_megerősítő_kód"))
      return
    }

    try {
      setLoading(true)
      const response = await axios.post("/api/admin/restore-stats", {
        year
      })

      if (response.data.success) {
        toast.success(response.data.message || "Sikeres visszaállítás!")
        setIsRestoreOpen(false)
        setConfirmText("")
      }
    } catch (error: any) {
      console.error("Restore error:", error)
      toast.error(error.response?.data?.error || "Hiba történt a visszaállítás során")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="backdrop-blur-xl bg-destructive/10 border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 backdrop-blur-md bg-destructive/20 rounded-lg flex items-center justify-center">
              <IconAlertTriangle className="size-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl text-destructive">{t("veszélyzóna")}</CardTitle>
              <CardDescription>
                {t("kritikus_rendszer_műveletek")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-background/50">
            <div>
              <h4 className="font-semibold text-foreground">{t("éves_zárás_és")}</h4>
              <p className="text-sm text-muted-foreground max-w-xl">
                {t("ez_a_művelet")}<br />
                <span className="font-bold">{t("visszaállítás")}</span> {t("ha_véletlenül_futtattad")}</p>
            </div>
            <div className="flex gap-2 shrink-0">
                 <Button 
                  variant="outline" 
                  onClick={() => setIsRestoreOpen(true)}
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  {t("visszaállítás_45")}</Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsOpen(true)}
                >
                  {t("év_lezárása")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WRAP DIALOG */}
      <Dialog open={isOpen} onOpenChange={(open) => !loading && setIsOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("év_lezárása_85")}{year}</DialogTitle>
            <DialogDescription>
              {t("biztosan_le_akarod")}{year}{t("es_évet_ez")}<strong>{t("törli")}</strong> {t("a_jelenlegi_statisztikákat")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("év_kiválasztása")}</Label>
              <Input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("megerősítés")}</Label>
              <div className="text-xs text-muted-foreground mb-1">
                {t("írd_be_a")}<span className="font-mono font-bold select-all">{t("confirm_wrap")}{year}</span>
              </div>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`CONFIRM_WRAP_${year}`}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              {t("mégse")}</Button>
            <Button 
              variant="destructive" 
              onClick={handleWrap} 
              disabled={loading || confirmText !== `CONFIRM_WRAP_${year}`}
            >
              {loading ? <IconLoader2 className="animate-spin mr-2" /> : null}
              {t("véglegesítés_és_reset")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESTORE DIALOG */}
      <Dialog open={isRestoreOpen} onOpenChange={(open) => !loading && setIsRestoreOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("visszaállítás_undo")}{year}</DialogTitle>
            <DialogDescription>
              {t("ez_a_művelet_57")}<strong>{t("visszaállítja")}</strong> {t("a_statisztikákat_a")}{year}{t("es_archívumból_és")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("visszaállítandó_év")}</Label>
              <Input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("megerősítés")}</Label>
              <div className="text-xs text-muted-foreground mb-1">
                {t("írd_be_a")}<span className="font-mono font-bold select-all">{t("confirm_restore")}{year}</span>
              </div>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`CONFIRM_RESTORE_${year}`}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreOpen(false)} disabled={loading}>
              {t("mégse")}</Button>
            <Button 
              variant="default" 
              onClick={handleRestore} 
              disabled={loading || confirmText !== `CONFIRM_RESTORE_${year}`}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? <IconLoader2 className="animate-spin mr-2" /> : null}
              {t("visszaállítás_55")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
