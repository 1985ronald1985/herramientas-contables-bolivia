
import React from 'react';

const Instructions: React.FC = () => {
    return (
        <div className="animate-fade-in text-gray-300">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">¡Bienvenido al Aplicativo de Actualización por UFV!</h2>

            <p className="mb-4">
                Esta herramienta está diseñada para facilitar el cálculo del ajuste por inflación para fines tributarios (IUE), según lo exige el DS 24051, manteniendo la separación con los registros contables.
            </p>

            <div className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-100 mb-3">Guía Rápida</h3>
                <ol className="list-decimal list-inside space-y-3">
                    <li>
                        <strong className="text-blue-400">Datos UFV (UFV_DATOS):</strong>
                        <p className="pl-6 text-gray-400">Contiene la tabla de cotizaciones de la UFV.</p>
                    </li>
                    <li>
                        <strong className="text-blue-400">Actualizador (ACTUALIZADOR_GENERAL):</strong>
                        <p className="pl-6 text-gray-400">Calculadora para actualizar cualquier monto entre dos fechas usando las UFV.</p>
                    </li>
                    <li>
                        <strong className="text-blue-400">Inversiones (INVERSIONES):</strong>
                        <p className="pl-6 text-gray-400">Módulo completo para gestionar, actualizar y generar reportes de inversiones con ajuste por UFV.</p>
                    </li>
                </ol>
            </div>

            <div className="mt-6">
                <h3 className="text-xl font-semibold text-gray-100 mb-3">Leyenda de colores:</h3>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-md bg-yellow-200 mr-2 border border-yellow-400"></span>
                        <span className="text-yellow-200">Celdas Amarillas:</span>
                        <span className="ml-2 text-gray-400">Datos de entrada (ingresar manualmente).</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-md bg-green-200 mr-2 border border-green-400"></span>
                        <span className="text-green-200">Celdas Verdes:</span>
                        <span className="ml-2 text-gray-400">Celdas con fórmulas (cálculo automático).</span>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default Instructions;
