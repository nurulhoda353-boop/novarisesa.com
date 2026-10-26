import 'package:flutter/material.dart';

import '../core/novafin_repository.dart';

/// The project / cost center / branch lists a posting form can tag an amount with.
class DimOptions {
  DimOptions({required this.projects, required this.costCenters, required this.branches});

  final List<Map<String, dynamic>> projects;
  final List<Map<String, dynamic>> costCenters;
  final List<Map<String, dynamic>> branches;

  static Future<DimOptions> load(NovaFinRepository repo) async {
    final results = await Future.wait([
      repo.listRaw('projects'),
      repo.listRaw('cost-centers'),
      repo.listRaw('branches'),
    ]);
    return DimOptions(
      projects: results[0].where((p) => p['is_active'] != false).toList(),
      costCenters: results[1].where((c) => c['is_active'] != false).toList(),
      branches: results[2],
    );
  }
}

/// What the user picked. Anything left empty simply isn't tagged.
class DimSelection {
  String? projectId;
  String? costCenterId;
  String? branchId;

  Map<String, dynamic> toJson() => {
        if (projectId != null) 'project_id': projectId,
        if (costCenterId != null) 'cost_center_id': costCenterId,
        if (branchId != null) 'branch_id': branchId,
      };
}

/// Three optional dropdowns in one row: which job, what kind of work, which branch.
class DimPickers extends StatelessWidget {
  const DimPickers({super.key, required this.options, required this.selection, required this.onChanged});

  final DimOptions options;
  final DimSelection selection;
  final VoidCallback onChanged;

  Widget _drop(String label, List<Map<String, dynamic>> rows, String? value, ValueChanged<String?> set, String Function(Map<String, dynamic>) text) {
    return Expanded(
      child: DropdownButtonFormField<String>(
        initialValue: value,
        isExpanded: true,
        decoration: InputDecoration(labelText: label, isDense: true),
        items: [
          const DropdownMenuItem<String>(value: null, child: Text('— none —')),
          for (final r in rows) DropdownMenuItem(value: r['id'] as String, child: Text(text(r), overflow: TextOverflow.ellipsis)),
        ],
        onChanged: (v) {
          set(v);
          onChanged();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      _drop('Project', options.projects, selection.projectId, (v) => selection.projectId = v, (r) => '${r['code']} · ${r['name']}'),
      const SizedBox(width: 8),
      _drop('Cost center', options.costCenters, selection.costCenterId, (v) => selection.costCenterId = v, (r) => r['name'].toString()),
      const SizedBox(width: 8),
      _drop('Branch', options.branches, selection.branchId, (v) => selection.branchId = v, (r) => r['name'].toString()),
    ]);
  }
}
