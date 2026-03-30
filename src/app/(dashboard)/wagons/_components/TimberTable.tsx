"use client";

import { t } from "@/i18n/uz";

interface Timber {
  id: number;
  thicknessMm: number;
  widthMm: number;
  lengthM: string;
  russiaCount: number;
  tashkentCount: number | null;
  customerCount: number | null;
}

interface TimberTableProps {
  timbers: Timber[];
}

function calcCub(
  thicknessMm: number,
  widthMm: number,
  lengthM: string,
  count: number
): number {
  const l = parseFloat(lengthM) || 0;
  return (thicknessMm / 1000) * (widthMm / 1000) * l * count;
}

export default function TimberTable({ timbers }: TimberTableProps) {
  const totalCubRussia = timbers.reduce(
    (sum, timber) => sum + calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.russiaCount),
    0
  );
  const totalCubTashkent = timbers.reduce(
    (sum, timber) => sum + calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.tashkentCount ?? 0),
    0
  );
  const totalCubCustomer = timbers.reduce(
    (sum, timber) => sum + calcCub(timber.thicknessMm, timber.widthMm, timber.lengthM, timber.customerCount ?? 0),
    0
  );

  if (timbers.length === 0) {
    return <p className="text-xs text-slate-400 py-2">{"Yog'ochlar yo'q"}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-2 font-semibold text-slate-500">{t.wagons.thickness}</th>
            <th className="text-left py-2 px-2 font-semibold text-slate-500">{t.wagons.width}</th>
            <th className="text-left py-2 px-2 font-semibold text-slate-500">{t.wagons.length}</th>
            <th className="text-left py-2 px-2 font-semibold text-slate-500">{t.wagons.russiaCount}</th>
            <th className="text-left py-2 px-2 font-semibold text-slate-500">{t.wagons.tashkentCount}</th>
            <th className="text-left py-2 px-2 font-semibold text-slate-500">{t.wagons.customerCount}</th>
          </tr>
        </thead>
        <tbody>
          {timbers.map((timber) => {
            return (
              <tr key={timber.id} className="border-b border-slate-100">
                <td className="py-2 px-2 text-slate-700">{timber.thicknessMm} mm</td>
                <td className="py-2 px-2 text-slate-700">{timber.widthMm} mm</td>
                <td className="py-2 px-2 text-slate-700">{timber.lengthM} m</td>
                <td className="py-2 px-2 text-slate-700">{timber.russiaCount}</td>
                <td className="py-2 px-2 text-slate-700">{timber.tashkentCount ?? 0}</td>
                <td className="py-2 px-2 text-slate-700">{timber.customerCount ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50">
            <td colSpan={3} className="py-2 px-2 font-semibold text-slate-600">
              {t.wagons.totalCubRussia}
            </td>
            <td colSpan={3} className="py-2 px-2 font-semibold text-slate-800">
              {totalCubRussia.toFixed(3)} m³
            </td>
          </tr>
          <tr className="bg-slate-50">
            <td colSpan={3} className="py-2 px-2 font-semibold text-slate-600">
              {t.wagons.totalCubTashkent}
            </td>
            <td colSpan={3} className="py-2 px-2 font-semibold text-slate-800">
              {totalCubTashkent.toFixed(3)} m³
            </td>
          </tr>
          <tr className="bg-slate-50">
            <td colSpan={3} className="py-2 px-2 font-semibold text-slate-600">
              {t.wagons.totalCubCustomer}
            </td>
            <td colSpan={3} className="py-2 px-2 font-semibold text-slate-800">
              {totalCubCustomer.toFixed(3)} m³
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
