import { create } from 'zustand';
import { Factory, Product, Process, Size } from '@/types';

interface FactoryState {
  currentFactory: Factory | null;
  products: Product[];
  processes: Process[];
  sizes: Size[];
  setFactory: (factory: Factory) => void;
  setProducts: (products: Product[]) => void;
  setProcesses: (processes: Process[]) => void;
  setSizes: (sizes: Size[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addProcess: (process: Process) => void;
  updateProcess: (id: string, process: Partial<Process>) => void;
  deleteProcess: (id: string) => void;
}

export const useFactoryStore = create<FactoryState>((set) => ({
  currentFactory: null,
  products: [],
  processes: [],
  sizes: [],
  setFactory: (factory) => set({ currentFactory: factory }),
  setProducts: (products) => set({ products }),
  setProcesses: (processes) => set({ processes }),
  setSizes: (sizes) => set({ sizes }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProduct: (id, product) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...product } : p)),
    })),
  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
  addProcess: (process) => set((state) => ({ processes: [...state.processes, process] })),
  updateProcess: (id, process) =>
    set((state) => ({
      processes: state.processes.map((p) => (p.id === id ? { ...p, ...process } : p)),
    })),
  deleteProcess: (id) =>
    set((state) => ({
      processes: state.processes.filter((p) => p.id !== id),
    })),
}));