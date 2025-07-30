import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import supabase from '../utils/supabase';
import './Mahasiswa.css';

// Definisi Tipe untuk Data Mahasiswa dan Error Form
interface Mahasiswa {
  Nim: string;
  Name: string;
  Gender: 'L' | 'P';
  BirthDate: string;
  Address: string;
  Contact: string;
  Status: boolean;
}

type FormErrors = Partial<Record<keyof Mahasiswa, string>>;

const initialFormState: Mahasiswa = {
  Nim: '',
  Name: '',
  Gender: 'L',
  BirthDate: '',
  Address: '',
  Contact: '',
  Status: true,
};

// =================================================================================
// Komponen Utama Aplikasi
// =================================================================================
export default function Mahasiswa() {
  const [students, setStudents] = useState<Mahasiswa[]>([]);
  const [studentToEdit, setStudentToEdit] = useState<Mahasiswa | null>(null);
  const [studentToView, setStudentToView] = useState<Mahasiswa | null>(null); // State baru untuk modal
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('Mahasiswa')
        .select('*')
        .order('Name', { ascending: true });
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(student =>
      student.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.Nim.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const handleSave = async (formData: Mahasiswa): Promise<boolean> => {
    setLoading(true);
    try {
      let error;
      if (studentToEdit) {
        ({ error } = await supabase.from('Mahasiswa').update(formData).eq('Nim', formData.Nim));
      } else {
        ({ error } = await supabase.from('Mahasiswa').insert([formData]));
      }
      if (error) throw error;
      
      setStudentToEdit(null);
      await fetchStudents();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Mahasiswa) => {
    setStudentToEdit(student);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    setStudentToEdit(null);
  };

  const handleDelete = async (nim: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      setLoading(true);
      try {
        const { error } = await supabase.from('Mahasiswa').delete().eq('Nim', nim);
        if (error) throw error;
        await fetchStudents();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleView = (student: Mahasiswa) => {
    setStudentToView(student);
  };

  const handleCloseView = () => {
    setStudentToView(null);
  };

  return (
    <div className="app-container">
      <Header />
      <StudentForm 
        key={studentToEdit ? studentToEdit.Nim : 'new-student'}
        studentToEdit={studentToEdit} 
        onSave={handleSave} 
        onClear={handleClear}
        isLoading={loading}
      />
      <StudentList 
        students={filteredStudents}
        onEdit={handleEdit} 
        onDelete={handleDelete}
        onView={handleView}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loading={loading}
        error={error}
      />
      {studentToView && (
        <StudentDetailModal student={studentToView} onClose={handleCloseView} />
      )}
      <Footer />
    </div>
  );
}

// =================================================================================
// Komponen Tambahan
// =================================================================================

const Header = () => (
  <header className="header">
    <h1>Manajemen Data Mahasiswa</h1>
  </header>
);

interface StudentFormProps {
  studentToEdit?: Mahasiswa | null;
  onSave: (data: Mahasiswa) => Promise<boolean>;
  onClear: () => void;
  isLoading: boolean;
}

const StudentForm = ({ studentToEdit, onSave, onClear, isLoading }: StudentFormProps) => {
  const [formData, setFormData] = useState<Mahasiswa>(initialFormState);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (studentToEdit) {
      setFormData(studentToEdit);
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
  }, [studentToEdit]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.Nim) newErrors.Nim = "NIM tidak boleh kosong.";
    if (!formData.Name) newErrors.Name = "Nama tidak boleh kosong.";
    if (!formData.BirthDate) newErrors.BirthDate = "Tanggal Lahir tidak boleh kosong.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({...prev, Status: e.target.value === 'true'}));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const success = await onSave(formData);
      if (success && !isEditMode) {
        setFormData(initialFormState);
      }
    }
  };

  const isEditMode = !!studentToEdit;

  return (
    <section className="form-section">
      <form onSubmit={handleSubmit} className="student-form">
        <h2>{isEditMode ? 'Edit Data Mahasiswa' : 'Tambah Data Baru'}</h2>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="Nim">NIM</label>
            <input type="text" name="Nim" id="Nim" value={formData.Nim} onChange={handleChange} disabled={isEditMode} />
            {errors.Nim && <span className="validation-error">{errors.Nim}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="Name">Nama Lengkap</label>
            <input type="text" name="Name" id="Name" value={formData.Name} onChange={handleChange} />
            {errors.Name && <span className="validation-error">{errors.Name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="Gender">Jenis Kelamin</label>
            <select name="Gender" id="Gender" value={formData.Gender} onChange={handleChange}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="BirthDate">Tanggal Lahir</label>
            <input type="date" name="BirthDate" id="BirthDate" value={formData.BirthDate} onChange={handleChange} />
            {errors.BirthDate && <span className="validation-error">{errors.BirthDate}</span>}
          </div>
          <div className="form-group full-width">
            <label htmlFor="Address">Alamat</label>
            <textarea name="Address" id="Address" rows={3} value={formData.Address} onChange={handleChange}></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="Contact">Kontak (No. HP)</label>
            <input type="tel" name="Contact" id="Contact" value={formData.Contact} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="Status">Status</label>
            <select name="Status" id="Status" value={String(formData.Status)} onChange={handleStatusChange}>
              <option value="true">Aktif</option>
              <option value="false">Tidak Aktif</option>
            </select>
          </div>
          <div className="form-actions">
            {isEditMode && <button type="button" onClick={() => { onClear(); setErrors({}) }} className="btn btn-secondary">Batal Edit</button>}
            <button type="submit" className="btn btn-success" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Tambah Data')}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

interface StudentListProps {
  students: Mahasiswa[];
  onEdit: (student: Mahasiswa) => void;
  onDelete: (nim: string) => void;
  onView: (student: Mahasiswa) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loading: boolean;
  error: string | null;
}

const StudentList = ({ students, onEdit, onDelete, onView, searchTerm, setSearchTerm, loading, error }: StudentListProps) => {
  return (
    <section className="list-section">
      <h2>Daftar Mahasiswa</h2>
      <div className="search-container">
        <input 
          type="text"
          placeholder="Cari berdasarkan Nama atau NIM..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="table-container">
        <table className="student-table">
          <thead>
            <tr>
              <th>NIM</th>
              <th>Nama</th>
              <th>Gender</th>
              <th>Status</th>
              <th className="table-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="loading-message">Memuat data...</td></tr>}
            {error && <tr><td colSpan={5} className="error-message"><strong>Error:</strong> {error}</td></tr>}
            {!loading && !error && students.length > 0 && (
              students.map((student) => (
                <tr key={student.Nim}>
                  <td>{student.Nim}</td>
                  <td>{student.Name}</td>
                  <td>{student.Gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td><span className={`status-badge ${student.Status ? 'status-active' : 'status-inactive'}`}>{student.Status ? 'Aktif' : 'Tidak Aktif'}</span></td>
                  <td className="table-actions">
                    <button onClick={() => onView(student)} className="btn btn-info">View</button>
                    <button onClick={() => onEdit(student)} className="btn btn-warning">Edit</button>
                    <button onClick={() => onDelete(student.Nim)} className="btn btn-danger">Hapus</button>
                  </td>
                </tr>
              ))
            )}
            {!loading && !error && students.length === 0 && (
              <tr><td colSpan={5} className="empty-message">
                {searchTerm ? 'Data tidak ditemukan.' : 'Belum ada data mahasiswa.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

interface StudentDetailModalProps {
  student: Mahasiswa;
  onClose: () => void;
}

const StudentDetailModal = ({ student, onClose }: StudentDetailModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Mahasiswa</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <dl className="detail-grid">
          <dt>NIM</dt>
          <dd>{student.Nim}</dd>

          <dt>Nama Lengkap</dt>
          <dd>{student.Name}</dd>

          <dt>Jenis Kelamin</dt>
          <dd>{student.Gender === 'L' ? 'Laki-laki' : 'Perempuan'}</dd>

          <dt>Tanggal Lahir</dt>
          <dd>{new Date(student.BirthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>

          <dt>Alamat</dt>
          <dd>{student.Address || '-'}</dd>

          <dt>Kontak</dt>
          <dd>{student.Contact || '-'}</dd>

          <dt>Status</dt>
          <dd><span className={`status-badge ${student.Status ? 'status-active' : 'status-inactive'}`}>{student.Status ? 'Aktif' : 'Tidak Aktif'}</span></dd>
        </dl>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Tutup</button>
        </div>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="footer">
    <p>Studi Kasus Front-End & Supabase &copy; {new Date().getFullYear()}</p>
  </footer>
);
