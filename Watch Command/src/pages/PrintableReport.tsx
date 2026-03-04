import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Loader2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function PrintableReport() {
    const { id } = useParams();

    const { data: report, isLoading, error } = useQuery({
        queryKey: ['printable_report', id],
        queryFn: async () => {
            if (!id) throw new Error("No report ID provided");
            const { data, error } = await supabase
                .from("generated_reports")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id
    });

    useEffect(() => {
        if (report && !isLoading) {
            // Slight delay to ensure fonts and styles are loaded before opening print dialog
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [report, isLoading]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-black font-mono">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 uppercase tracking-widest text-xs">Preparing official document...</span>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-black font-mono">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 uppercase">Document Not Found</h1>
                    <p className="mt-2 text-sm text-gray-500">The requested report could not be located in the database.</p>
                </div>
            </div>
        );
    }

    const { parameters, report_type, name, created_at } = report;
    const { generatedFor, metrics, incidents, timeframe } = parameters as any;

    return (
        <div className="bg-white text-black min-h-screen font-sans p-8 md:p-12 relative overflow-hidden print:p-0">
            {/* Background Watermark */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 print:opacity-[0.05]">
                <div className="transform -rotate-45 text-[150px] font-black tracking-tighter uppercase whitespace-nowrap text-gray-900 pointer-events-none select-none">
                    WATCH COMMAND
                </div>
            </div>

            <div className="max-w-[210mm] mx-auto min-h-[297mm] bg-white relative z-10">
                {/* Header Sequence */}
                <div className="border-b-[3px] border-black pb-6 mb-8 flex justify-between items-end">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 bg-black rounded flex items-center justify-center border-2 border-gray-800">
                            <ShieldCheck className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Kenya Incident Report</h1>
                            <p className="text-sm font-bold tracking-[0.2em] text-gray-600 mt-1 uppercase">Watch Command Center</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">OFFICIAL EXPORT</span>
                        </div>
                        <div className="font-mono text-[10px] text-gray-500 text-right uppercase leading-tight">
                            Document ID: {report.id.split('-')[0]}<br />
                            Generated: {format(new Date(created_at), "MMM dd, yyyy HH:mm:ss")}<br />
                            Classification: RESTRICTED
                        </div>
                    </div>
                </div>

                {/* Report Meta Data */}
                <div className="mb-10 grid grid-cols-2 gap-8 bg-gray-50 p-6 border border-gray-200 rounded">
                    <div>
                        <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3">Report Details</h3>
                        <div className="space-y-2">
                            <div className="flex">
                                <span className="w-24 text-gray-500 text-xs font-medium uppercase font-mono mt-0.5">Title:</span>
                                <span className="text-sm font-bold flex-1">{name}</span>
                            </div>
                            <div className="flex">
                                <span className="w-24 text-gray-500 text-xs font-medium uppercase font-mono mt-0.5">Type:</span>
                                <span className="text-sm font-medium uppercase relative">{report_type.replace('_', ' ')}</span>
                            </div>
                            <div className="flex">
                                <span className="w-24 text-gray-500 text-xs font-medium uppercase font-mono mt-0.5">Period:</span>
                                <span className="text-sm font-medium">Last {timeframe}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3">Compiled For</h3>
                        <div className="space-y-2">
                            <div className="flex">
                                <span className="w-32 text-gray-500 text-xs font-medium uppercase font-mono mt-0.5">Opr. Name:</span>
                                <span className="text-sm font-bold flex-1 uppercase">{generatedFor?.full_name || 'N/A'}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-gray-500 text-xs font-medium uppercase font-mono mt-0.5">Employee ID:</span>
                                <span className="text-sm font-bold font-mono tracking-wider">{generatedFor?.employee_id || 'N/A'}</span>
                            </div>
                            <div className="flex">
                                <span className="w-32 text-gray-500 text-xs font-medium uppercase font-mono mt-0.5">Designation:</span>
                                <span className="text-sm font-medium uppercase">{generatedFor?.role || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="mb-10">
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-gray-200 pb-2 mb-6">Execution Summary</h2>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-white border border-gray-200 p-5 rounded-lg flex flex-col justify-center items-center">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Total Handled</span>
                            <span className="text-3xl font-black font-mono">{metrics?.total || 0}</span>
                        </div>
                        <div className="flex-1 bg-white border border-gray-200 p-5 rounded-lg flex flex-col justify-center items-center">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Resolved</span>
                            <span className="text-3xl font-black font-mono">{metrics?.resolved || 0}</span>
                        </div>
                        <div className="flex-1 bg-white border border-gray-200 p-5 rounded-lg flex flex-col justify-center items-center">
                            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Resolution Rate</span>
                            <span className="text-3xl font-black font-mono">{metrics?.resolutionRate || "0.0"}%</span>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest border-b border-gray-200 pb-2 mb-6">Incident Log Activity</h2>

                    {incidents && incidents.length > 0 ? (
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="font-bold uppercase text-[10px] text-gray-500 tracking-wider pb-3 border-b-2 border-black">Date</th>
                                    <th className="font-bold uppercase text-[10px] text-gray-500 tracking-wider pb-3 border-b-2 border-black px-2">ID</th>
                                    <th className="font-bold uppercase text-[10px] text-gray-500 tracking-wider pb-3 border-b-2 border-black px-2">Title</th>
                                    <th className="font-bold uppercase text-[10px] text-gray-500 tracking-wider pb-3 border-b-2 border-black px-2 text-center">Severity</th>
                                    <th className="font-bold uppercase text-[10px] text-gray-500 tracking-wider pb-3 border-b-2 border-black text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map((inc: any, index: number) => (
                                    <tr key={index} className="border-b border-gray-100 last:border-black/50">
                                        <td className="py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{inc.date.split(',')[0]}</td>
                                        <td className="py-3 px-2 font-mono text-xs text-gray-800">{inc.id.substring(0, 8).toUpperCase()}</td>
                                        <td className="py-3 px-2 font-medium truncate max-w-[250px]">{inc.title}</td>
                                        <td className="py-3 px-2 text-center">
                                            <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded border border-gray-300">
                                                {inc.severity}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right uppercase text-[10px] font-bold tracking-wider">{inc.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-12 text-center border border-dashed border-gray-300 rounded text-gray-500 text-sm font-mono uppercase">
                            No incident log data available for this timeframe.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-16 pt-6 border-t border-gray-200 text-center">
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                        END OF REPORT DOCUMENT • DO NOT DISTRIBUTE WITHOUT CLEARANCE
                    </p>
                </div>
            </div>

            {/* Global style overrides specifically for print format ensuring A4 sizes and hiding browser UI elements */}
            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                        body {
                            background-color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        /* Hide everything else outside this component if needed by generic layout */
                        body * {
                            visibility: hidden;
                        }
                        #root, #root * {
                            visibility: visible;
                        }
                        #root {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                    }
                `}
            </style>
        </div>
    );
}
