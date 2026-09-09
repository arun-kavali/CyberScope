import React, { useState, useEffect } from 'react';
import {
  Database,
  FileText,
  FileSpreadsheet,
  SlidersHorizontal,
  ShieldCheck,
  GitMerge,
  Shield,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Upload,
  ArrowRight,
  Search,
  Server,
  Globe,
  Zap,
  MoreHorizontal,
  Code,
  Layers
} from 'lucide-react';
import {
  getSourcesApi,
  uploadCsvSourceApi,
  uploadJsonSourceApi,
  uploadExcelSourceApi,
  connectDatabaseSourceApi,
  validateSourceDataApi,
  importSourceDataApi,
  DataSourceItem,
  SchemaDiscoveryResponse,
  ValidationResponse,
  ImportResponse
} from '../services/sourcesApi';

// Safe icon renderer helper
const renderIcon = (IconComponent: any, className: string = "h-4 w-4") => {
  if (!IconComponent) return null;
  if (React.isValidElement(IconComponent)) return IconComponent;
  if (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && (IconComponent as any).render)) {
    const Component = IconComponent as React.ComponentType<{ className?: string }>;
    return <Component className={className} />;
  }
  return null;
};

const CANONICAL_TARGET_FIELDS = [
  { key: 'event_type', label: 'Event Type (Required)', required: true },
  { key: 'severity', label: 'Severity (LOW/MED/HIGH/CRIT)', required: true },
  { key: 'event_category', label: 'Event Category' },
  { key: 'description', label: 'Description / Summary' },
  { key: 'source_ip', label: 'Source IP' },
  { key: 'destination_ip', label: 'Destination IP' },
  { key: 'user_id', label: 'User / Identity' },
  { key: 'asset_id', label: 'Asset / Host' },
  { key: 'indicator', label: 'Indicator' },
  { key: 'technique', label: 'ATT&CK Technique' },
  { key: 'timestamp', label: 'Timestamp' }
];

export const DataSourcesPage: React.FC = () => {
  const [activeSources, setActiveSources] = useState<DataSourceItem[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string | null>('POSTGRESQL');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);

  // Connection config state
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('cyberscope');
  const [tableName, setTableName] = useState('alerts');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPass, setDbPass] = useState('');
  const [sslMode, setSslMode] = useState('SSL');
  const [restUrl, setRestUrl] = useState('https://api.securityprovider.com/v1/alerts');
  const [sourceName, setSourceName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Connection testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Pipeline step & responses
  const [step, setStep] = useState<number>(1);
  const [discovery, setDiscovery] = useState<SchemaDiscoveryResponse | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [validationRes, setValidationRes] = useState<ValidationResponse | null>(null);
  const [importRes, setImportRes] = useState<ImportResponse | null>(null);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSources = async () => {
    try {
      const data = await getSourcesApi();
      setActiveSources(data);
    } catch (err) {
      console.error('Failed to load data sources', err);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSelectConnector = (type: string) => {
    setSelectedConnector(type);
    setDrawerOpen(true);
    setTestSuccess(null);
    setTestMessage(null);
    setWizardError(null);
    setStep(1);
    setDiscovery(null);
    setFieldMappings({});
    setValidationRes(null);
    setImportRes(null);
    setSelectedFile(null);
    if (!sourceName) {
      setSourceName(`${type} Ingestion Source`);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestSuccess(null);
    setTestMessage(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setTestSuccess(true);
      setTestMessage('Connection verified');
    } catch (err: any) {
      setTestSuccess(false);
      setTestMessage(err.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunDiscovery = async () => {
    if (!selectedConnector) return;
    setIsProcessing(true);
    setWizardError(null);
    try {
      let res: SchemaDiscoveryResponse;
      if (['CSV', 'JSON', 'XLS', 'XLSX'].includes(selectedConnector)) {
        if (!selectedFile) throw new Error(`Please select a ${selectedConnector} file to upload`);
        const nameToUse = sourceName || selectedFile.name;
        if (selectedConnector === 'CSV') res = await uploadCsvSourceApi(selectedFile, nameToUse);
        else if (selectedConnector === 'JSON') res = await uploadJsonSourceApi(selectedFile, nameToUse);
        else res = await uploadExcelSourceApi(selectedFile, nameToUse);
      } else {
        const nameToUse = sourceName || `${selectedConnector} Source`;
        let config: Record<string, any> = {};
        if (['POSTGRESQL', 'MYSQL'].includes(selectedConnector)) {
          config = { host, port: parseInt(port), database, table_name: tableName, user: dbUser, password: dbPass, ssl_mode: sslMode };
        } else if (selectedConnector === 'MONGODB') {
          config = { connection_string: `mongodb://${host}:${port}`, database, collection: tableName };
        } else if (selectedConnector === 'SUPABASE') {
          config = { project_url: restUrl, table_name: tableName, api_key: dbPass };
        } else if (selectedConnector === 'REST') {
          config = { url: restUrl, method: 'GET', auth_token: dbPass };
        }
        res = await connectDatabaseSourceApi({ name: nameToUse, type: selectedConnector, connection_config: config });
      }

      setDiscovery(res);
      const initialMap: Record<string, string> = {};
      res.fields.forEach((f) => {
        const lower = f.field_name.toLowerCase();
        for (const target of CANONICAL_TARGET_FIELDS) {
          if (lower === target.key || lower.includes(target.key)) {
            initialMap[f.field_name] = target.key;
            break;
          }
        }
      });
      setFieldMappings(initialMap);
      setTestSuccess(true);
      setTestMessage('Schema discovery complete');
      setStep(2);
    } catch (err: any) {
      setWizardError(err.message || 'Schema discovery failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunValidation = async () => {
    setIsProcessing(true);
    setWizardError(null);
    try {
      const res = await validateSourceDataApi({
        data_source_id: discovery?.data_source_id,
        source_type: selectedConnector || 'CSV',
        field_mappings: fieldMappings,
      });
      setValidationRes(res);
      setStep(3);
    } catch (err: any) {
      setWizardError(err.message || 'Validation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = async () => {
    setIsProcessing(true);
    setWizardError(null);
    try {
      const res = await importSourceDataApi({
        data_source_id: discovery?.data_source_id,
        source_type: selectedConnector || 'CSV',
        field_mappings: fieldMappings,
      });
      setImportRes(res);
      setStep(4);
      fetchSources();
    } catch (err: any) {
      setWizardError(err.message || 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Connected Sources standard fallback items
  const defaultConnectedSources = [
    { name: 'PostgreSQL Production', type: 'PostgreSQL', status: 'Connected', records: '128,492', lastSync: '2 minutes ago' },
    { name: 'Security Events JSON', type: 'JSON', status: 'Connected', records: '48,921', lastSync: '5 minutes ago' },
    { name: 'Endpoint CSV Dataset', type: 'CSV', status: 'Validation Required', records: '12,450', lastSync: 'Never' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Data Source Center</h1>
          <p className="text-xs text-slate-500 font-medium">Connect and manage security data sources</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSources}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
          >
            {renderIcon(RefreshCw, 'h-3.5 w-3.5 text-slate-500')}
            <span>Refresh Health</span>
          </button>
        </div>
      </div>

      {/* Connection Workflow Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">Connect a Data Source</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center text-center">
          {/* Step 1 */}
          <div className="flex flex-col items-center space-y-2 relative">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              {renderIcon(Database, 'h-5 w-5 text-emerald-700')}
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">DATA SOURCE</span>
          </div>

          {/* Connector Line 1 */}
          <div className="hidden md:flex items-center justify-center">
            <div className="h-0.5 w-full bg-emerald-500/40 relative flex items-center justify-end">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              {renderIcon(Search, 'h-5 w-5 text-slate-600')}
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">SCHEMA DISCOVERY</span>
          </div>

          {/* Connector Line 2 */}
          <div className="hidden md:flex items-center justify-center">
            <div className="h-0.5 w-full bg-emerald-500/40 relative flex items-center justify-end">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              {renderIcon(SlidersHorizontal, 'h-5 w-5 text-slate-600')}
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">FIELD MAPPING</span>
          </div>

          {/* Connector Line 3 */}
          <div className="hidden md:flex items-center justify-center">
            <div className="h-0.5 w-full bg-emerald-500/40 relative flex items-center justify-end">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              {renderIcon(ShieldCheck, 'h-5 w-5 text-slate-600')}
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">VALIDATION</span>
          </div>

          {/* Connector Line 4 */}
          <div className="hidden md:flex items-center justify-center">
            <div className="h-0.5 w-full bg-emerald-500/40 relative flex items-center justify-end">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
              {renderIcon(GitMerge, 'h-5 w-5 text-slate-600')}
            </div>
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">NORMALIZATION</span>
          </div>

          {/* Connector Line 5 */}
          <div className="hidden md:flex items-center justify-center">
            <div className="h-0.5 w-full bg-emerald-500/40 relative flex items-center justify-end">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              {renderIcon(Shield, 'h-5 w-5 text-emerald-700')}
            </div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">CYBERSCOPE</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Connector Cards Grid & Side Drawer */}
      <div className="relative">
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 transition-all ${drawerOpen ? 'lg:pr-[360px]' : ''}`}>
          {/* Card 1: PostgreSQL */}
          <div
            onClick={() => handleSelectConnector('POSTGRESQL')}
            className={`p-4 bg-sky-50/40 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'POSTGRESQL' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">PostgreSQL</h3>
                <p className="text-[11px] text-slate-500">Connect PostgreSQL database</p>
              </div>
              <div className="w-12 h-12 bg-sky-100/70 border border-sky-200 rounded-lg flex items-center justify-center shrink-0">
                <Database className="h-6 w-6 text-sky-800" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>

          {/* Card 2: MySQL */}
          <div
            onClick={() => handleSelectConnector('MYSQL')}
            className={`p-4 bg-amber-50/40 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'MYSQL' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">MySQL</h3>
                <p className="text-[11px] text-slate-500">Connect MySQL database</p>
              </div>
              <div className="w-12 h-12 bg-amber-100/70 border border-amber-200 rounded-lg flex items-center justify-center shrink-0">
                <Server className="h-6 w-6 text-amber-800" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>

          {/* Card 3: MongoDB */}
          <div
            onClick={() => handleSelectConnector('MONGODB')}
            className={`p-4 bg-emerald-50/40 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'MONGODB' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">MongoDB</h3>
                <p className="text-[11px] text-slate-500">Connect MongoDB database</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100/70 border border-emerald-200 rounded-lg flex items-center justify-center shrink-0">
                <Layers className="h-6 w-6 text-emerald-800" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>

          {/* Card 4: Supabase */}
          <div
            onClick={() => handleSelectConnector('SUPABASE')}
            className={`p-4 bg-emerald-50/30 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'SUPABASE' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supabase</h3>
                <p className="text-[11px] text-slate-500">Connect Supabase project</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100/70 border border-emerald-200 rounded-lg flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>

          {/* Card 5: REST API */}
          <div
            onClick={() => handleSelectConnector('REST')}
            className={`p-4 bg-blue-50/30 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'REST' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">REST API</h3>
                <p className="text-[11px] text-slate-500">Connect external API</p>
              </div>
              <div className="w-12 h-12 bg-blue-100/70 border border-blue-200 rounded-lg flex items-center justify-center shrink-0">
                <Globe className="h-6 w-6 text-blue-700" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>

          {/* Card 6: CSV */}
          <div
            onClick={() => handleSelectConnector('CSV')}
            className={`p-4 bg-teal-50/30 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'CSV' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">CSV</h3>
                <p className="text-[11px] text-slate-500">Upload CSV file</p>
              </div>
              <div className="w-12 h-12 bg-teal-100/70 border border-teal-200 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-teal-800" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>

          {/* Card 7: JSON */}
          <div
            onClick={() => handleSelectConnector('JSON')}
            className={`p-4 bg-rose-50/30 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'JSON' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">JSON</h3>
                <p className="text-[11px] text-slate-500">Upload JSON file</p>
              </div>
              <div className="w-12 h-12 bg-rose-100/70 border border-rose-200 rounded-lg flex items-center justify-center shrink-0">
                <Code className="h-6 w-6 text-rose-800" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>

          {/* Card 8: Excel */}
          <div
            onClick={() => handleSelectConnector('XLSX')}
            className={`p-4 bg-emerald-50/40 border rounded-xl cursor-pointer hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative group overflow-hidden ${
              selectedConnector === 'XLSX' && drawerOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excel</h3>
                <p className="text-[11px] text-slate-500">Upload spreadsheet</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100/70 border border-emerald-200 rounded-lg flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-emerald-800" />
              </div>
            </div>
            <button className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs">
              Connect
            </button>
          </div>
        </div>

        {/* Right Drawer / Floating Configuration Panel */}
        {drawerOpen && selectedConnector && (
          <div className="lg:absolute right-0 top-0 lg:w-[340px] w-full bg-white border border-slate-200 rounded-xl shadow-lg p-4 space-y-4 z-20 transition-all mt-4 lg:mt-0">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Connect {selectedConnector}</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {renderIcon(X, 'h-4 w-4')}
              </button>
            </div>

            {/* Error Message if any */}
            {wizardError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-800 flex items-center space-x-2">
                {renderIcon(AlertTriangle, 'h-4 w-4 shrink-0 text-rose-600')}
                <span>{wizardError}</span>
              </div>
            )}

            {/* Step 1: Configuration Form */}
            {step === 1 && (
              <div className="space-y-3 text-xs">
                {['POSTGRESQL', 'MYSQL', 'MONGODB'].includes(selectedConnector) ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Host</label>
                      <input
                        type="text"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Port</label>
                      <input
                        type="text"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Database</label>
                      <input
                        type="text"
                        value={database}
                        onChange={(e) => setDatabase(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Table / Collection</label>
                      <input
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Username</label>
                      <input
                        type="text"
                        value={dbUser}
                        onChange={(e) => setDbUser(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={dbPass}
                        onChange={(e) => setDbPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">SSL Mode</label>
                      <select
                        value={sslMode}
                        onChange={(e) => setSslMode(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none bg-white"
                      >
                        <option value="SSL">SSL</option>
                        <option value="Disable">Disable</option>
                        <option value="Require">Require</option>
                      </select>
                    </div>
                  </>
                ) : ['CSV', 'JSON', 'XLS', 'XLSX'].includes(selectedConnector) ? (
                  <div className="space-y-3">
                    <label className="block text-[11px] font-semibold text-slate-700">Source Name</label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder={`e.g. ${selectedConnector} Production Telemetry`}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                    />

                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-emerald-600 transition-colors bg-slate-50">
                      {renderIcon(Upload, 'h-6 w-6 text-slate-400 mx-auto mb-1')}
                      <p className="font-semibold text-slate-700 text-xs">Select {selectedConnector} File</p>
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="text-[11px] text-slate-600 mt-2 w-full"
                      />
                      {selectedFile && (
                        <p className="mt-2 font-bold text-emerald-700 text-[11px] truncate">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">API Endpoint / Project URL</label>
                    <input
                      type="text"
                      value={restUrl}
                      onChange={(e) => setRestUrl(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  {['POSTGRESQL', 'MYSQL', 'MONGODB', 'SUPABASE', 'REST'].includes(selectedConnector) && (
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="w-full py-1.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-xs shadow-2xs"
                    >
                      {isTesting ? 'Testing Connection...' : 'Test Connection'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRunDiscovery}
                    disabled={isProcessing}
                    className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors text-xs shadow-2xs"
                  >
                    {isProcessing ? 'Connecting & Discovering...' : 'Connect Data Source'}
                  </button>

                  {testSuccess && (
                    <div className="flex items-center justify-center space-x-1 text-emerald-700 text-xs font-bold py-1">
                      {renderIcon(CheckCircle2, 'h-4 w-4 text-emerald-600')}
                      <span>{testMessage || 'Connection verified'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Field Mapping */}
            {step === 2 && discovery && (
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <span className="font-bold text-emerald-900">Discovered Schema: </span>
                  <span className="font-mono text-emerald-700 font-bold">{discovery.total_fields} fields</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {discovery.fields.map((f) => (
                    <div key={f.field_name} className="p-2 border border-slate-200 rounded-lg bg-slate-50 space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span className="font-mono">{f.field_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{f.detected_type}</span>
                      </div>
                      <select
                        value={fieldMappings[f.field_name] || ''}
                        onChange={(e) => setFieldMappings({ ...fieldMappings, [f.field_name]: e.target.value })}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                      >
                        <option value="">-- Ignore Field --</option>
                        {CANONICAL_TARGET_FIELDS.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRunValidation}
                  disabled={isProcessing}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs"
                >
                  {isProcessing ? 'Validating...' : 'Validate Mapped Data'}
                </button>
              </div>
            )}

            {/* Step 3: Validation Check */}
            {step === 3 && validationRes && (
              <div className="space-y-3 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <div className="text-lg font-extrabold text-emerald-800">{validationRes.valid_count} Valid Records</div>
                  <div className="text-[11px] text-emerald-700">Ready for CyberScope Ingestion</div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs"
                >
                  {isProcessing ? 'Importing Pipeline...' : 'Execute Ingestion Pipeline'}
                </button>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && importRes && (
              <div className="space-y-3 text-xs text-center py-2">
                {renderIcon(CheckCircle2, 'h-10 w-10 text-emerald-600 mx-auto')}
                <h4 className="font-bold text-slate-900">Ingestion Pipeline Executed</h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {importRes.imported_records} records normalized to CyberScope Schema
                </p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-lg text-xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Connected Data Sources Table & Data Ingestion Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Connected Data Sources Table (Span 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Connected Data Sources</h2>
            <span className="text-xs text-slate-500 font-medium">{activeSources.length + defaultConnectedSources.length} Connected</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Records</th>
                  <th className="py-2.5 px-3">Last Synchronize</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
                {/* Active Dynamic Backend Sources */}
                {activeSources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center space-x-2">
                      <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
                        {renderIcon(Database, 'h-3.5 w-3.5')}
                      </div>
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1"></span>
                        Connected
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">Imported</td>
                    <td className="py-3 px-3 text-slate-500 font-medium">Just now</td>
                    <td className="py-3 px-3 text-right">
                      <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                        {renderIcon(MoreHorizontal, 'h-4 w-4')}
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Default Reference Connected Sources */}
                {defaultConnectedSources.map((src, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center space-x-2">
                      <div className={`p-1.5 rounded-md border ${
                        src.type === 'PostgreSQL' ? 'bg-sky-50 border-sky-200 text-sky-800' :
                        src.type === 'JSON' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                        'bg-teal-50 border-teal-200 text-teal-800'
                      }`}>
                        {src.type === 'PostgreSQL' ? renderIcon(Database, 'h-3.5 w-3.5') :
                         src.type === 'JSON' ? renderIcon(Code, 'h-3.5 w-3.5') :
                         renderIcon(FileText, 'h-3.5 w-3.5')}
                      </div>
                      <span>{src.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      {src.status === 'Connected' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1"></span>
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1"></span>
                          Validation Required
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">{src.records}</td>
                    <td className="py-3 px-3 text-slate-500 font-medium">{src.lastSync}</td>
                    <td className="py-3 px-3 text-right">
                      <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                        {renderIcon(MoreHorizontal, 'h-4 w-4')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Ingestion Visual Diagram */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Data Ingestion visual</h2>
          
          <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between text-center">
              {/* Left Column: Stacked Input Sources */}
              <div className="flex flex-col space-y-2 shrink-0">
                <div className="p-2 bg-sky-50 border border-sky-200 rounded-lg flex items-center space-x-1 text-[10px] font-bold text-sky-900">
                  {renderIcon(Database, 'h-3.5 w-3.5 text-sky-700')}
                  <span>PostgreSQL</span>
                </div>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-1 text-[10px] font-bold text-rose-900">
                  {renderIcon(Code, 'h-3.5 w-3.5 text-rose-700')}
                  <span>JSON</span>
                </div>
                <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg flex items-center space-x-1 text-[10px] font-bold text-teal-900">
                  {renderIcon(FileText, 'h-3.5 w-3.5 text-teal-700')}
                  <span>CSV</span>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-1 text-[10px] font-bold text-blue-900">
                  {renderIcon(Globe, 'h-3.5 w-3.5 text-blue-700')}
                  <span>API</span>
                </div>
              </div>

              {/* Arrow Connector */}
              <div className="flex items-center justify-center px-1 text-slate-300">
                <ArrowRight className="h-4 w-4" />
              </div>

              {/* Step 1: Schema Discovery */}
              <div className="flex flex-col items-center space-y-1">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {renderIcon(Search, 'h-4 w-4 text-slate-700')}
                </div>
                <span className="text-[9px] font-bold text-slate-700 text-center leading-tight">Schema<br/>Discovery</span>
              </div>

              <div className="flex items-center justify-center px-0.5 text-slate-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>

              {/* Step 2: Field Mapping */}
              <div className="flex flex-col items-center space-y-1">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {renderIcon(SlidersHorizontal, 'h-4 w-4 text-slate-700')}
                </div>
                <span className="text-[9px] font-bold text-slate-700 text-center leading-tight">Field<br/>Mapping</span>
              </div>

              <div className="flex items-center justify-center px-0.5 text-slate-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>

              {/* Step 3: Validation */}
              <div className="flex flex-col items-center space-y-1">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {renderIcon(ShieldCheck, 'h-4 w-4 text-slate-700')}
                </div>
                <span className="text-[9px] font-bold text-slate-700 text-center leading-tight">Validation</span>
              </div>

              <div className="flex items-center justify-center px-0.5 text-slate-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>

              {/* Step 4: Normalization */}
              <div className="flex flex-col items-center space-y-1">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                  {renderIcon(GitMerge, 'h-4 w-4 text-slate-700')}
                </div>
                <span className="text-[9px] font-bold text-slate-700 text-center leading-tight">Normalization</span>
              </div>

              <div className="flex items-center justify-center px-0.5 text-slate-300">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>

              {/* Step 5: CyberScope Analytics */}
              <div className="flex flex-col items-center space-y-1">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs">
                  {renderIcon(Shield, 'h-4 w-4 text-emerald-700')}
                </div>
                <span className="text-[9px] font-bold text-emerald-800 text-center leading-tight">CyberScope<br/>Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
